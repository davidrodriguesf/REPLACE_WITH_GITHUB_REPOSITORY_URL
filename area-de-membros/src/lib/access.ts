import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNewCourseEmail, sendWelcomeEmail } from "@/lib/email";
import { siteUrl } from "@/lib/utils";

type Admin = ReturnType<typeof createAdminClient>;

function confirmLink(hashedToken: string, type: "invite" | "recovery" | "magiclink") {
  const params = new URLSearchParams({ token_hash: hashedToken, type, next: "/definir-senha" });
  return siteUrl(`/auth/confirm?${params}`);
}

async function findUserIdByEmail(admin: Admin, email: string) {
  const { data } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/**
 * Libera cursos para um e-mail. Se o usuário não existir, cria a conta e
 * envia o e-mail com o link para criar a senha. Se já existir, só libera e avisa.
 */
export async function grantCourseAccess(opts: {
  email: string;
  name?: string | null;
  courseIds: string[];
  source: "purchase" | "admin";
  orderId?: string | null;
  grantedBy?: string | null;
  sendEmail?: boolean;
}) {
  const admin = createAdminClient();
  const email = opts.email.trim().toLowerCase();
  const sendEmail = opts.sendEmail ?? true;
  let userId = await findUserIdByEmail(admin, email);
  let created = false;
  let link: string | null = null;

  if (!userId) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { data: { full_name: opts.name || "" } },
    });
    if (error) {
      // Conta existe no Auth mas sem perfil (ex.: criada antes do trigger)
      const fallback = await admin.auth.admin.generateLink({ type: "magiclink", email });
      if (fallback.error || !fallback.data.user) throw new Error(error.message);
      userId = fallback.data.user.id;
      await admin.from("profiles").upsert({ id: userId, email, full_name: opts.name || email.split("@")[0] });
    } else {
      userId = data.user.id;
      created = true;
      link = confirmLink(data.properties.hashed_token, "invite");
      // garante o perfil caso o trigger ainda não exista
      await admin
        .from("profiles")
        .upsert({ id: userId, email, full_name: opts.name || email.split("@")[0] }, { onConflict: "id", ignoreDuplicates: true });
    }
  }

  const { data: existing } = await admin
    .from("enrollments")
    .select("course_id")
    .eq("user_id", userId)
    .in("course_id", opts.courseIds);
  const already = new Set((existing ?? []).map((e) => e.course_id as string));
  const newCourseIds = opts.courseIds.filter((id) => !already.has(id));

  if (opts.courseIds.length) {
    const { error } = await admin.from("enrollments").upsert(
      opts.courseIds.map((course_id) => ({
        user_id: userId,
        course_id,
        source: opts.source,
        order_id: opts.orderId ?? null,
        granted_by: opts.grantedBy ?? null,
        expires_at: null,
      })),
      { onConflict: "user_id,course_id" },
    );
    if (error) throw new Error(error.message);

    // Se havia solicitação pendente para esses cursos, marca como aprovada
    await admin
      .from("access_requests")
      .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: opts.grantedBy ?? null })
      .eq("user_id", userId)
      .in("course_id", opts.courseIds)
      .eq("status", "pending");
  }

  if (sendEmail) {
    const { data: courses } = await admin.from("courses").select("title").in("id", created ? opts.courseIds : newCourseIds);
    const titles = (courses ?? []).map((c) => c.title as string);
    if (created && link) await sendWelcomeEmail(email, opts.name ?? null, link, titles);
    else if (newCourseIds.length) await sendNewCourseEmail(email, opts.name ?? null, titles);
  }

  return { userId, created, newCourseIds };
}

export async function revokeCourseAccess(opts: { email: string; courseIds: string[]; onlySource?: "purchase" | "admin" }) {
  const admin = createAdminClient();
  const userId = await findUserIdByEmail(admin, opts.email.trim().toLowerCase());
  if (!userId || !opts.courseIds.length) return { userId, revoked: 0 };
  let q = admin.from("enrollments").delete({ count: "exact" }).eq("user_id", userId).in("course_id", opts.courseIds);
  if (opts.onlySource) q = q.eq("source", opts.onlySource);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return { userId, revoked: count ?? 0 };
}

/** Gera link de redefinição de senha (sem revelar se o e-mail existe). */
export async function createRecoveryLink(email: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: email.trim().toLowerCase() });
  if (error || !data.properties?.hashed_token) return null;
  return confirmLink(data.properties.hashed_token, "recovery");
}
