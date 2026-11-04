import "server-only";
import { createHash, randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { Db } from "./client";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
export const SESSION_COOKIE = "sid";
const SESSION_DAYS = 30;
const DUMMY_HASH = "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "==";
const service = () => new Db("service", null);
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// ---------- senhas ----------
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return ["scrypt", salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false;
  const [alg, salt, key] = stored.split("$");
  if (alg !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64");
  const got = await scrypt(password, Buffer.from(salt, "base64"), expected.length);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

// ---------- sessões ----------
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  await service().sql("insert into auth.sessions (token_hash, user_id, expires_at) values ($1, $2, $3)", [sha256(token), userId, expires.toISOString()]);
  await service().sql("update auth.users set last_sign_in_at = now() where id = $1", [userId]);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires });
}

/** Id do usuário da sessão atual (ou null). */
export async function sessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await service().sql<{ user_id: string }>("select user_id from auth.sessions where token_hash = $1 and expires_at > now()", [sha256(token)]);
  return rows[0]?.user_id ?? null;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await service().sql("delete from auth.sessions where token_hash = $1", [sha256(token)]);
  jar.delete(SESSION_COOKIE);
}

// ---------- login ----------
export async function signIn(email: string, password: string) {
  const rows = await service().sql<{ id: string; password_hash: string | null; is_active: boolean | null }>(
    "select u.id, u.password_hash, p.is_active from auth.users u left join public.profiles p on p.id = u.id where u.email = lower($1)",
    [email.trim()],
  );
  const u = rows[0];
  // Compara mesmo sem usuário, para não revelar pelo tempo de resposta quais e-mails existem
  const ok = await verifyPassword(password, u?.password_hash ?? DUMMY_HASH);
  if (!u || !ok) return { error: "E-mail ou senha incorretos." };
  if (u.is_active === false) return { error: "Seu acesso está desativado. Fale com o RH." };
  await createSession(u.id);
  return { userId: u.id };
}

export async function setUserPassword(userId: string, password: string) {
  await service().sql("update auth.users set password_hash = $1 where id = $2", [await hashPassword(password), userId]);
  // Encerra as outras sessões ao trocar a senha
  const jar = await cookies();
  const current = jar.get(SESSION_COOKIE)?.value;
  await service().sql("delete from auth.sessions where user_id = $1 and token_hash <> $2", [userId, current ? sha256(current) : ""]);
}

// ---------- usuários e tokens de e-mail ----------
export async function findUserByEmail(email: string) {
  const rows = await service().sql<{ id: string }>("select id from auth.users where email = lower($1)", [email.trim()]);
  return rows[0]?.id ?? null;
}

/** Cria a conta (sem senha). O gatilho do banco cria o perfil. */
export async function createUser(email: string, fullName: string | null) {
  const rows = await service().sql<{ id: string }>(
    "insert into auth.users (email, raw_user_meta_data) values (lower($1), $2) on conflict (email) do update set email = excluded.email returning id",
    [email.trim(), JSON.stringify({ full_name: fullName ?? "" })],
  );
  return rows[0]!.id;
}

/** Token de uso único: convite (7 dias) ou redefinição de senha (2 horas). */
export async function createEmailToken(userId: string, purpose: "invite" | "recovery") {
  const token = randomBytes(32).toString("base64url");
  const hours = purpose === "invite" ? 24 * 7 : 2;
  await service().sql("insert into auth.tokens (token_hash, user_id, purpose, expires_at) values ($1, $2, $3, now() + make_interval(hours => $4::int))", [sha256(token), userId, purpose, hours]);
  return token;
}

/** Valida e consome o token; devolve o id do usuário. */
export async function consumeEmailToken(token: string) {
  const rows = await service().sql<{ user_id: string }>(
    "update auth.tokens set used_at = now() where token_hash = $1 and used_at is null and expires_at > now() returning user_id",
    [sha256(token)],
  );
  return rows[0]?.user_id ?? null;
}

export async function hasAnyAdmin() {
  const rows = await service().sql<{ n: number }>("select count(*)::int as n from public.profiles where role = 'admin'");
  return (rows[0]?.n ?? 0) > 0;
}

/** O banco já foi preparado (tabelas criadas)? */
export async function isDatabaseReady() {
  const rows = await service().sql<{ ok: boolean }>("select to_regclass('public.profiles') is not null and to_regclass('auth.users') is not null as ok");
  return !!rows[0]?.ok;
}
