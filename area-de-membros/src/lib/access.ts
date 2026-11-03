import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/email";
import { siteUrl } from "@/lib/utils";
import type { Role } from "@/lib/types";

function confirmLink(hashedToken: string, type: "invite" | "recovery" | "magiclink") {
  const params = new URLSearchParams({ token_hash: hashedToken, type, next: "/definir-senha" });
  return siteUrl(`/auth/confirm?${params}`);
}

export type EmployeeInput = {
  email: string;
  full_name?: string | null;
  job_role_id?: string | null;
  department?: string | null;
  manager_id?: string | null;
  role?: Role;
  hired_at?: string | null;
};

/**
 * Convida (ou atualiza) um colaborador. Conta nova → e-mail para criar a senha.
 * Usa a service role: chame somente depois de verificar que quem pede é admin.
 */
export async function inviteEmployee(input: EmployeeInput, opts: { resend?: boolean } = {}) {
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();
  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  let userId = (existing?.id as string | undefined) ?? null;
  let created = false;
  let link: string | null = null;

  if (!userId) {
    const { data, error } = await admin.auth.admin.generateLink({ type: "invite", email, options: { data: { full_name: input.full_name || "" } } });
    if (error) {
      const fallback = await admin.auth.admin.generateLink({ type: "magiclink", email });
      if (fallback.error || !fallback.data.user) throw new Error(error.message);
      userId = fallback.data.user.id;
    } else {
      userId = data.user.id;
      created = true;
      link = confirmLink(data.properties.hashed_token, "invite");
    }
  } else if (opts.resend) {
    const { data } = await admin.auth.admin.generateLink({ type: "recovery", email });
    if (data?.properties?.hashed_token) link = confirmLink(data.properties.hashed_token, "recovery");
  }

  const fields: Record<string, unknown> = { id: userId, email };
  for (const k of ["full_name", "job_role_id", "department", "manager_id", "role", "hired_at"] as const) {
    if (input[k] !== undefined) fields[k] = input[k] || (k === "role" ? "employee" : null);
  }
  const { error } = await admin.from("profiles").upsert(fields, { onConflict: "id" });
  if (error) throw new Error(error.message);

  if (link) await sendWelcomeEmail(email, input.full_name ?? null, link);
  return { userId, created };
}

export async function createRecoveryLink(email: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: email.trim().toLowerCase() });
  if (error || !data.properties?.hashed_token) return null;
  return confirmLink(data.properties.hashed_token, "recovery");
}
