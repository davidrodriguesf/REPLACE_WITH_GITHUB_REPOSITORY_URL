"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";
import { createSession, signIn } from "@/lib/db/auth";
import { PestxError, pestxEnabled, pestxSignIn } from "@/lib/pestx";
import { ensureLocalCompany, syncPestxUser } from "@/lib/company";
import { createRecoveryLink } from "@/lib/access";
import { sendPasswordResetEmail } from "@/lib/email";
import { str } from "@/lib/utils";

export type FormState = { error?: string; success?: string; email?: string } | undefined;

async function authenticate(email: string, password: string): Promise<{ error?: string }> {
  if (!email || !password) return { error: "Informe e-mail e senha." };
  if (!pestxEnabled()) {
    // instalação sem PestX: só o login próprio, com uma empresa local
    const r = await signIn(email, password);
    if (r.error || !r.userId) return { error: r.error };
    await ensureLocalCompany(r.userId);
    return {};
  }
  // 1º o login do PestX (mesmo e-mail e senha do app.pestx.com.br)
  let pestxError: PestxError | null = null;
  try {
    const who = await pestxSignIn(email, password);
    const sync = await syncPestxUser(who);
    if ("error" in sync) return { error: sync.error };
    await createSession(sync.userId);
    return {};
  } catch (e) {
    if (!(e instanceof PestxError)) throw e;
    pestxError = e;
  }
  // 2º quem não tem login no PestX e foi convidado pela Academia (senha própria)
  const local = await signIn(email, password, { requireCompany: true });
  if (!local.error) return {};
  return { error: pestxError.kind === "credentials" ? local.error : pestxError.message };
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const r = await authenticate(str(form, "email"), str(form, "password"));
  if (r.error) return { error: r.error, email: str(form, "email") };
  const next = str(form, "next");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/inicio");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const email = str(form, "email");
  if (!email) return { error: "Informe seu e-mail." };
  try {
    const link = await createRecoveryLink(email);
    if (link) await sendPasswordResetEmail(email, link);
  } catch (e) {
    console.error(e);
  }
  // Mesma resposta sempre, para não revelar quais e-mails existem
  return { success: "Se este e-mail estiver cadastrado, você receberá um link em instantes. Confira também o spam." };
}

export async function setPassword(_: FormState, form: FormData): Promise<FormState> {
  const password = str(form, "password");
  const confirm = str(form, "confirm");
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  if (password !== confirm) return { error: "As senhas não conferem." };
  const supabase = await createClient();
  const name = str(form, "full_name");
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Seu link expirou. Peça um novo em “Esqueci minha senha”." };
  await supabase.auth.updateUser({ password });
  if (name) await supabase.from("profiles").update({ full_name: name }).eq("id", data.user.id);
  redirect("/inicio?bemvindo=1");
}
