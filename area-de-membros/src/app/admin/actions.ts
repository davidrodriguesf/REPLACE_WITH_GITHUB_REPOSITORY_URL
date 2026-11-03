"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { grantCourseAccess } from "@/lib/access";
import { localInputToIso, slugify, str, strOrNull } from "@/lib/utils";

export type AdminState = { error?: string; success?: string } | undefined;

const intOr = (v: string, d = 0) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);

// ---------------- Cursos ----------------
export async function saveCourse(_: AdminState, form: FormData): Promise<AdminState> {
  const { supabase } = await requireAdmin();
  const id = str(form, "id");
  const title = str(form, "title");
  if (!title) return { error: "Informe o título." };
  const accessType = str(form, "access_type") === "free" ? "free" : "paid";
  const row = {
    title,
    slug: slugify(str(form, "slug") || title),
    subtitle: strOrNull(form, "subtitle"),
    description: strOrNull(form, "description"),
    cover_url: strOrNull(form, "cover_url"),
    access_type: accessType,
    checkout_url: accessType === "paid" ? strOrNull(form, "checkout_url") : null,
    appmax_product_ids: accessType === "paid" ? str(form, "appmax_product_ids").split(/[\s,;]+/).filter(Boolean) : [],
    is_published: form.get("is_published") === "on",
    position: intOr(str(form, "position")),
  };
  const res = id
    ? await supabase.from("courses").update(row).eq("id", id).select("id").single()
    : await supabase.from("courses").insert(row).select("id").single();
  if (res.error) return { error: res.error.code === "23505" ? "Já existe um curso com esse endereço (slug)." : res.error.message };
  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/cursos/${res.data.id}`);
  return { success: "Curso salvo!" };
}

export async function deleteCourse(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("courses").delete().eq("id", str(form, "id"));
  revalidatePath("/", "layout");
  redirect("/admin/cursos");
}

export async function saveModule(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(form, "id");
  const courseId = str(form, "course_id");
  const row = { title: str(form, "title") || "Novo módulo", position: intOr(str(form, "position")), course_id: courseId };
  if (id) await supabase.from("modules").update(row).eq("id", id);
  else await supabase.from("modules").insert(row);
  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function deleteModule(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("modules").delete().eq("id", str(form, "id"));
  revalidatePath(`/admin/cursos/${str(form, "course_id")}`);
}

export async function saveLesson(_: AdminState, form: FormData): Promise<AdminState> {
  const { supabase } = await requireAdmin();
  const id = str(form, "id");
  const courseId = str(form, "course_id");
  const title = str(form, "title");
  if (!title) return { error: "Informe o título da aula." };
  const row = {
    module_id: str(form, "module_id"),
    course_id: courseId,
    title,
    description: strOrNull(form, "description"),
    video_url: strOrNull(form, "video_url"),
    content: strOrNull(form, "content"),
    attachment_url: strOrNull(form, "attachment_url"),
    duration_minutes: str(form, "duration_minutes") ? intOr(str(form, "duration_minutes")) : null,
    position: intOr(str(form, "position")),
  };
  const { error } = id ? await supabase.from("lessons").update(row).eq("id", id) : await supabase.from("lessons").insert(row);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect(`/admin/cursos/${courseId}`);
}

export async function deleteLesson(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("lessons").delete().eq("id", str(form, "id"));
  revalidatePath("/", "layout");
  redirect(`/admin/cursos/${str(form, "course_id")}`);
}

// ---------------- Alunos e acessos ----------------
export async function grantAccess(_: AdminState, form: FormData): Promise<AdminState> {
  const { user } = await requireAdmin();
  const email = str(form, "email").toLowerCase();
  const courseIds = form.getAll("course_ids").map(String).filter(Boolean);
  if (!email || !email.includes("@")) return { error: "Informe um e-mail válido." };
  if (!courseIds.length) return { error: "Selecione pelo menos um curso." };
  try {
    const r = await grantCourseAccess({
      email,
      name: strOrNull(form, "name"),
      courseIds,
      source: "admin",
      grantedBy: user.id,
      sendEmail: form.get("send_email") === "on",
    });
    revalidatePath("/admin", "layout");
    return { success: r.created ? `Conta criada e acesso liberado para ${email}.` : `Acesso liberado para ${email}.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao liberar acesso." };
  }
}

export async function revokeEnrollment(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("enrollments").delete().eq("id", str(form, "id"));
  revalidatePath("/admin", "layout");
}

export async function setRole(form: FormData) {
  const { supabase, user } = await requireAdmin();
  const id = str(form, "user_id");
  if (id === user.id) return; // não remover o próprio admin por engano
  await supabase.from("profiles").update({ role: str(form, "role") === "admin" ? "admin" : "student" }).eq("id", id);
  revalidatePath("/admin", "layout");
}

export async function reviewRequest(form: FormData) {
  const { supabase, user } = await requireAdmin();
  const id = str(form, "id");
  const approve = str(form, "decision") === "approve";
  const { data: req } = await supabase.from("access_requests").select("user_id, course_id, profiles!access_requests_user_id_fkey(email, full_name)").eq("id", id).single();
  if (!req) return;
  if (approve) {
    const p = req.profiles as unknown as { email: string; full_name: string | null };
    await grantCourseAccess({ email: p.email, name: p.full_name, courseIds: [req.course_id], source: "admin", grantedBy: user.id });
  } else {
    await supabase.from("access_requests").update({ status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", id);
  }
  revalidatePath("/admin", "layout");
}

// ---------------- Eventos ----------------
export async function saveEvent(_: AdminState, form: FormData): Promise<AdminState> {
  const { supabase, user } = await requireAdmin();
  const id = str(form, "id");
  const startsAt = localInputToIso(str(form, "starts_at"));
  if (!str(form, "title") || !startsAt) return { error: "Informe título e data de início." };
  const row = {
    title: str(form, "title"),
    description: strOrNull(form, "description"),
    starts_at: startsAt,
    ends_at: localInputToIso(str(form, "ends_at")),
    location: strOrNull(form, "location"),
    meeting_url: strOrNull(form, "meeting_url"),
    cover_url: strOrNull(form, "cover_url"),
    is_published: form.get("is_published") === "on",
  };
  const { error } = id
    ? await supabase.from("events").update(row).eq("id", id)
    : await supabase.from("events").insert({ ...row, created_by: user.id });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect("/admin/eventos");
}

export async function deleteEvent(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("events").delete().eq("id", str(form, "id"));
  revalidatePath("/", "layout");
  redirect("/admin/eventos");
}

// ---------------- Comunidade (espaços) ----------------
export async function saveSpace(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(form, "id");
  const name = str(form, "name");
  if (!name) return;
  const row = {
    name,
    slug: slugify(str(form, "slug") || name),
    description: strOrNull(form, "description"),
    admin_only_posts: form.get("admin_only_posts") === "on",
    position: intOr(str(form, "position")),
  };
  if (id) await supabase.from("spaces").update(row).eq("id", id);
  else await supabase.from("spaces").insert(row);
  revalidatePath("/", "layout");
}

export async function deleteSpace(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("spaces").delete().eq("id", str(form, "id"));
  revalidatePath("/", "layout");
}
