"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/db/admin";
import { createSession, createUser, hasAnyAdmin, setUserPassword } from "@/lib/db/auth";
import { str } from "@/lib/utils";

export type SetupState = { error?: string; values?: { full_name: string; email: string } } | undefined;

function keyMatches(given: string) {
  const expected = process.env.SETUP_KEY ?? "";
  if (expected.length < 12) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Cria o primeiro administrador. Só funciona enquanto não existir nenhum admin. */
export async function createFirstAdmin(_: SetupState, form: FormData): Promise<SetupState> {
  const values = { full_name: str(form, "full_name"), email: str(form, "email") };
  const fail = (error: string) => ({ error, values });
  if (await hasAnyAdmin()) return fail("Já existe um administrador. Use a tela de login.");
  if (!keyMatches(str(form, "setup_key"))) return fail("Chave de instalação incorreta (variável SETUP_KEY, mínimo 12 caracteres).");
  const email = str(form, "email").toLowerCase();
  const name = str(form, "full_name");
  const password = str(form, "password");
  if (!email.includes("@") || !name) return fail("Informe nome e e-mail.");
  if (password.length < 8) return fail("A senha precisa ter pelo menos 8 caracteres.");

  const userId = await createUser(email, name);
  await setUserPassword(userId, password);
  await createAdminClient().from("profiles").update({ role: "admin", full_name: name, department: "Recursos Humanos" }).eq("id", userId);
  await createSession(userId);
  redirect("/admin");
}
