import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { createEmailToken, createUser, findUserByEmail } from "@/lib/db/auth";
import { sendWelcomeEmail } from "@/lib/email";
import { siteUrl } from "@/lib/utils";
import type { Role } from "@/lib/types";

function confirmLink(token: string) {
  return siteUrl(`/auth/confirm?${new URLSearchParams({ token, next: "/definir-senha" })}`);
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
 * Chame somente depois de verificar que quem pede é admin.
 */
export async function inviteEmployee(input: EmployeeInput, opts: { resend?: boolean; companyId: string }) {
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();
  let userId = await findUserByEmail(email);
  const created = !userId;
  if (userId) {
    // nunca mexe em quem é de outra empresa
    const rows = await admin.sql<{ company_id: string | null }>("select company_id from public.profiles where id = $1", [userId]);
    if (rows[0]?.company_id && rows[0].company_id !== opts.companyId) throw new Error("Este e-mail já está cadastrado em outra empresa.");
  } else userId = await createUser(email, input.full_name ?? null);

  const fields: Record<string, unknown> = { company_id: opts.companyId };
  for (const k of ["full_name", "job_role_id", "department", "manager_id", "role", "hired_at"] as const) {
    if (input[k] !== undefined) fields[k] = input[k] || (k === "role" ? "employee" : null);
  }
  {
    const { error } = await admin.from("profiles").update(fields).eq("id", userId);
    if (error) throw new Error(error.message);
  }

  if (created || opts.resend) {
    const link = confirmLink(await createEmailToken(userId, "invite"));
    await sendWelcomeEmail(email, input.full_name ?? null, link);
  }
  return { userId, created };
}

/** Link de redefinição de senha (null se o e-mail não existir). */
export async function createRecoveryLink(email: string) {
  const userId = await findUserByEmail(email);
  if (!userId) return null;
  return confirmLink(await createEmailToken(userId, "recovery"));
}
