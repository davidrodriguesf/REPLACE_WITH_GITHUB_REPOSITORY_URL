"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { str, strOrNull } from "@/lib/utils";

export type ActionState = { error?: string; success?: string } | undefined;

// ---------- Cursos ----------
export async function requestAccess(form: FormData) {
  const { supabase, user } = await requireUser();
  const courseId = str(form, "course_id");
  await supabase.from("access_requests").upsert(
    { user_id: user.id, course_id: courseId, status: "pending", message: strOrNull(form, "message") },
    { onConflict: "user_id,course_id", ignoreDuplicates: true },
  );
  revalidatePath("/", "layout");
}

export async function toggleLessonComplete(form: FormData) {
  const { supabase, user } = await requireUser();
  const lessonId = str(form, "lesson_id");
  const done = str(form, "done") === "1";
  if (done) await supabase.from("lesson_progress").delete().eq("user_id", user.id).eq("lesson_id", lessonId);
  else await supabase.from("lesson_progress").upsert({ user_id: user.id, lesson_id: lessonId });
  const nextUrl = str(form, "next_url");
  revalidatePath("/", "layout");
  if (!done && nextUrl) redirect(nextUrl);
}

// ---------- Comunidade ----------
export async function createPost(_: ActionState, form: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const title = str(form, "title");
  const body = str(form, "body");
  if (!title || !body) return { error: "Preencha título e mensagem." };
  const { data, error } = await supabase
    .from("posts")
    .insert({ space_id: str(form, "space_id"), author_id: user.id, title: title.slice(0, 200), body: body.slice(0, 10000) })
    .select("id")
    .single();
  if (error) return { error: "Não foi possível publicar neste espaço." };
  revalidatePath("/comunidade");
  redirect(`/comunidade/${data.id}`);
}

export async function deletePost(form: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("posts").delete().eq("id", str(form, "post_id"));
  revalidatePath("/comunidade");
  redirect("/comunidade");
}

export async function togglePin(form: FormData) {
  const { supabase, profile } = await requireUser();
  if (profile.role !== "admin") return;
  const id = str(form, "post_id");
  await supabase.from("posts").update({ pinned: str(form, "pinned") !== "1" }).eq("id", id);
  revalidatePath("/comunidade");
  revalidatePath(`/comunidade/${id}`);
}

export async function toggleLike(form: FormData) {
  const { supabase, user } = await requireUser();
  const postId = str(form, "post_id");
  if (str(form, "liked") === "1") await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
  else await supabase.from("post_likes").upsert({ post_id: postId, user_id: user.id }, { ignoreDuplicates: true });
  revalidatePath("/comunidade");
  revalidatePath(`/comunidade/${postId}`);
}

export async function createComment(_: ActionState, form: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const postId = str(form, "post_id");
  const body = str(form, "body");
  if (!body) return { error: "Escreva um comentário." };
  const { error } = await supabase.from("comments").insert({ post_id: postId, author_id: user.id, body: body.slice(0, 5000) });
  if (error) return { error: "Não foi possível comentar." };
  revalidatePath(`/comunidade/${postId}`);
  return { success: "ok" };
}

export async function deleteComment(form: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("comments").delete().eq("id", str(form, "comment_id"));
  revalidatePath(`/comunidade/${str(form, "post_id")}`);
}

// ---------- Eventos ----------
export async function toggleRsvp(form: FormData) {
  const { supabase, user } = await requireUser();
  const eventId = str(form, "event_id");
  if (str(form, "going") === "1") await supabase.from("event_rsvps").delete().eq("event_id", eventId).eq("user_id", user.id);
  else await supabase.from("event_rsvps").upsert({ event_id: eventId, user_id: user.id }, { ignoreDuplicates: true });
  revalidatePath("/eventos");
  revalidatePath(`/eventos/${eventId}`);
  revalidatePath("/dashboard");
}

// ---------- Perfil ----------
export async function updateProfile(_: ActionState, form: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: str(form, "full_name").slice(0, 120) || null, bio: strOrNull(form, "bio"), avatar_url: strOrNull(form, "avatar_url") })
    .eq("id", user.id);
  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/", "layout");
  return { success: "Perfil atualizado!" };
}

export async function changePassword(_: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const password = str(form, "password");
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  if (password !== str(form, "confirm")) return { error: "As senhas não conferem." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { success: "Senha alterada!" };
}
