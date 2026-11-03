"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireManager } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/email";
import { str, strOrNull } from "@/lib/utils";

// Usado por gestores (só a própria equipe, garantido pelo RLS) e pelo RH/admin.

export type MgrState = { error?: string; success?: string } | undefined;

async function notify(supabase: Awaited<ReturnType<typeof requireManager>>["supabase"], userId: string, subject: string, title: string, body: string, path: string) {
  const { data: p } = await supabase.from("profiles").select("email").eq("id", userId).maybeSingle();
  if (p?.email) await sendNotificationEmail(p.email, subject, title, body, path).catch(() => undefined);
}

export async function createPlan(_: MgrState, form: FormData): Promise<MgrState> {
  const { supabase, user } = await requireManager();
  const userId = str(form, "user_id");
  const title = str(form, "title");
  if (!userId || !title) return { error: "Escolha o colaborador e dê um título ao plano." };
  const goals = str(form, "goals").split("\n").map((s) => s.trim()).filter(Boolean);
  const { data, error } = await supabase
    .from("development_plans")
    .insert({ user_id: userId, title, description: strOrNull(form, "description"), due_date: strOrNull(form, "due_date"), created_by: user.id })
    .select("id")
    .single();
  if (error) return { error: "Você não tem permissão para criar plano para este colaborador." };
  if (goals.length) await supabase.from("plan_goals").insert(goals.map((g, i) => ({ plan_id: data.id, title: g, position: i })));
  await notify(supabase, userId, "Novo plano de desenvolvimento", title, "Seu gestor criou um novo plano de desenvolvimento para você. Confira as metas.", `/desenvolvimento/pdi/${data.id}`);
  revalidatePath("/", "layout");
  redirect(`/desenvolvimento/pdi/${data.id}`);
}

export async function updatePlan(form: FormData) {
  const { supabase } = await requireManager();
  const id = str(form, "plan_id");
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (form.has("title")) patch.title = str(form, "title");
  if (form.has("description")) patch.description = strOrNull(form, "description");
  if (form.has("due_date")) patch.due_date = strOrNull(form, "due_date");
  if (form.has("status")) patch.status = str(form, "status");
  await supabase.from("development_plans").update(patch).eq("id", id);
  revalidatePath(`/desenvolvimento/pdi/${id}`);
  revalidatePath("/desenvolvimento");
}

export async function deletePlan(form: FormData) {
  const { supabase } = await requireManager();
  await supabase.from("development_plans").delete().eq("id", str(form, "plan_id"));
  revalidatePath("/", "layout");
  redirect(str(form, "back") || "/equipe");
}

export async function addGoal(form: FormData) {
  const { supabase } = await requireManager();
  const planId = str(form, "plan_id");
  const title = str(form, "title");
  if (!title) return;
  await supabase.from("plan_goals").insert({
    plan_id: planId,
    title,
    description: strOrNull(form, "description"),
    due_date: strOrNull(form, "due_date"),
    course_id: strOrNull(form, "course_id"),
    position: Number(str(form, "position")) || 0,
  });
  revalidatePath(`/desenvolvimento/pdi/${planId}`);
}

export async function deleteGoal(form: FormData) {
  const { supabase } = await requireManager();
  await supabase.from("plan_goals").delete().eq("id", str(form, "goal_id"));
  revalidatePath(`/desenvolvimento/pdi/${str(form, "plan_id")}`);
}

export async function assignCourse(_: MgrState, form: FormData): Promise<MgrState> {
  const { supabase, user } = await requireManager();
  const userId = str(form, "user_id");
  const courseId = str(form, "course_id");
  if (!courseId) return { error: "Escolha um curso." };
  const { error } = await supabase
    .from("assignments")
    .upsert({ user_id: userId, course_id: courseId, due_date: strOrNull(form, "due_date"), assigned_by: user.id }, { onConflict: "user_id,course_id" });
  if (error) return { error: "Não foi possível atribuir o curso." };
  const { data: c } = await supabase.from("courses").select("title, slug").eq("id", courseId).maybeSingle();
  if (c) await notify(supabase, userId, `Novo curso para você: ${c.title}`, c.title, "Um curso foi atribuído a você na plataforma.", `/cursos/${c.slug}`);
  revalidatePath("/", "layout");
  return { success: "Curso atribuído." };
}

export async function removeAssignment(form: FormData) {
  const { supabase } = await requireManager();
  await supabase.from("assignments").delete().eq("id", str(form, "assignment_id"));
  revalidatePath("/", "layout");
}
