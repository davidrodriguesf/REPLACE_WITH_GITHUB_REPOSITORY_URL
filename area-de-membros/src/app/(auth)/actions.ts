"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRecoveryLink } from "@/lib/access";
import { sendPasswordResetEmail } from "@/lib/email";
import { str } from "@/lib/utils";

export type FormState = { error?: string; success?: string } | undefined;

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: str(form, "email").toLowerCase(), password: str(form, "password") });
  if (error) return { error: "E-mail ou senha incorretos." };
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
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Não foi possível salvar. Seu link pode ter expirado — peça um novo em “Esqueci minha senha”." };
  if (name && data.user) await supabase.from("profiles").update({ full_name: name }).eq("id", data.user.id);
  redirect("/inicio?bemvindo=1");
}
