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
export async function inviteEmployee(input: EmployeeInput, opts: { resend?: boolean } = {}) {
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();
  let userId = await findUserByEmail(email);
  const created = !userId;
  if (!userId) userId = await createUser(email, input.full_name ?? null);

  const fields: Record<string, unknown> = {};
  for (const k of ["full_name", "job_role_id", "department", "manager_id", "role", "hired_at"] as const) {
    if (input[k] !== undefined) fields[k] = input[k] || (k === "role" ? "employee" : null);
  }
  if (Object.keys(fields).length) {
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
