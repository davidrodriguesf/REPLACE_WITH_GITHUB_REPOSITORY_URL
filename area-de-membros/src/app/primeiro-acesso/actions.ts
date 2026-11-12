"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/db/admin";
import { createSession, createUser, hasAnyAdmin, isDatabaseReady, setUserPassword } from "@/lib/db/auth";
import { SCHEMA_SQL } from "@/lib/db/schema-sql";
import { revalidatePath } from "next/cache";
import { str } from "@/lib/utils";
import { ensureLocalCompany } from "@/lib/company";
import { pestxEnabled } from "@/lib/pestx";

export type SetupState = { error?: string; values?: { full_name: string; email: string } } | undefined;

function keyMatches(given: string) {
  const expected = process.env.SETUP_KEY ?? "";
  if (expected.length < 12) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Cria as tabelas no banco (Neon) na primeira vez. */
export async function prepareDatabase(_: SetupState, form: FormData): Promise<SetupState> {
  if (!keyMatches(str(form, "setup_key"))) return { error: "Chave de instalação incorreta (variável SETUP_KEY, mínimo 12 caracteres)." };
  if (!(await isDatabaseReady())) {
    try {
      await createAdminClient().script(SCHEMA_SQL);
    } catch (e) {
      return { error: "Não foi possível preparar o banco: " + (e instanceof Error ? e.message : String(e)) };
    }
  }
  revalidatePath("/primeiro-acesso");
  return undefined;
}

/** Cria o primeiro administrador. Só funciona enquanto não existir nenhum admin. */
export async function createFirstAdmin(_: SetupState, form: FormData): Promise<SetupState> {
  const values = { full_name: str(form, "full_name"), email: str(form, "email") };
  const fail = (error: string) => ({ error, values });
  if (!(await isDatabaseReady())) return fail("Prepare o banco de dados primeiro.");
  if (await hasAnyAdmin()) return fail("Já existe um administrador. Use a tela de login.");
  if (pestxEnabled()) return fail("Esta Academia usa o login do PestX: entre em /login com o seu e-mail e senha do PestX.");
  if (!keyMatches(str(form, "setup_key"))) return fail("Chave de instalação incorreta (variável SETUP_KEY, mínimo 12 caracteres).");
  const email = str(form, "email").toLowerCase();
  const name = str(form, "full_name");
  const password = str(form, "password");
  if (!email.includes("@") || !name) return fail("Informe nome e e-mail.");
  if (password.length < 8) return fail("A senha precisa ter pelo menos 8 caracteres.");

  const userId = await createUser(email, name);
  await setUserPassword(userId, password);
  await createAdminClient().from("profiles").update({ role: "admin", full_name: name, department: "Recursos Humanos" }).eq("id", userId);
  await ensureLocalCompany(userId, str(form, "company_name") || "Minha empresa");
  await createSession(userId);
  redirect("/admin");
}
