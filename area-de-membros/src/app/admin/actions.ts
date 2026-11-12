"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { UploadError, fileField } from "@/lib/uploads";
import { inviteEmployee } from "@/lib/access";
import { localInputToIso, slugify, str, strOrNull } from "@/lib/utils";

export type AdminState = { error?: string; success?: string } | undefined;

const intOr = (v: string, d = 0) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);
const numOrNull = (v: string) => (v && Number.isFinite(Number(v.replace(",", "."))) ? Number(v.replace(",", ".")) : null);
const ids = (form: FormData, key: string) => form.getAll(key).map(String).filter(Boolean);
const done = (path = "/") => revalidatePath(path, "layout");
const uploadMsg = (e: unknown) => (e instanceof UploadError ? e.message : null);
/** Pasta dos arquivos: a da empresa (ou "plataforma" nos cursos do marketplace). */
const folderOf = (p: { company_id: string | null }) => p.company_id || "plataforma";
/** Ações sem tela de retorno: volta para a página com ?erro= quando o arquivo é inválido. */
function backWithError(path: string, e: unknown): never {
  const m = uploadMsg(e);
  if (!m) throw e;
  redirect(`${path}?erro=${encodeURIComponent(m)}`);
}

// ---------------- Colaboradores ----------------
export async function inviteEmployeeAction(_: AdminState, form: FormData): Promise<AdminState> {
  const { profile } = await requireAdmin();
  const email = str(form, "email").toLowerCase();
  if (!email.includes("@")) return { error: "Informe um e-mail válido." };
  try {
    const r = await inviteEmployee({
      email,
      full_name: strOrNull(form, "full_name"),
      job_role_id: strOrNull(form, "job_role_id"),
      department: strOrNull(form, "department"),
      manager_id: strOrNull(form, "manager_id"),
      role: (str(form, "role") || "employee") as "employee" | "manager" | "admin",
      hired_at: strOrNull(form, "hired_at"),
    }, { companyId: profile.company_id! });
    done("/admin");
    return { success: r.created ? `Convite enviado para ${email}.` : `${email} já tinha conta: dados atualizados.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao convidar." };
  }
}

export async function updateEmployee(_: AdminState, form: FormData): Promise<AdminState> {
  const { supabase, user } = await requireAdmin();
  const id = str(form, "id");
  const role = str(form, "role");
  if (id === user.id && role !== "admin") return { error: "Você não pode remover seu próprio acesso de admin." };
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: strOrNull(form, "full_name"),
      job_role_id: strOrNull(form, "job_role_id"),
      department: strOrNull(form, "department"),
      manager_id: strOrNull(form, "manager_id") === id ? null : strOrNull(form, "manager_id"),
      role: ["employee", "manager", "admin"].includes(role) ? role : "employee",
      hired_at: strOrNull(form, "hired_at"),
      is_active: form.get("is_active") === "on" || id === user.id,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  done("/admin");
  return { success: "Dados salvos." };
}

export async function resendInvite(form: FormData) {
  const { profile } = await requireAdmin();
  await inviteEmployee({ email: str(form, "email") }, { resend: true, companyId: profile.company_id! });
  done("/admin");
}

// ---------------- Funções ----------------
export async function saveJobRole(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(form, "id");
  const row = { name: str(form, "name"), description: strOrNull(form, "description") };
  if (!row.name) return;
  if (id) await supabase.from("job_roles").update(row).eq("id", id);
  else await supabase.from("job_roles").insert(row);
  done();
}

export async function deleteJobRole(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("job_roles").delete().eq("id", str(form, "id"));
  done();
}

// ---------------- Trilhas ----------------
export async function saveTrail(_: AdminState, form: FormData): Promise<AdminState> {
  const { supabase, profile } = await requireAdmin();
  const id = str(form, "id");
  let cover: string | null;
  try { cover = await fileField(form, "cover", "image", folderOf(profile)); } catch (e) { const m = uploadMsg(e); if (m) return { error: m }; throw e; }
  const row = { title: str(form, "title"), description: strOrNull(form, "description"), cover_url: cover, position: intOr(str(form, "position")) };
  if (!row.title) return { error: "Dê um nome à trilha." };
  const res = id ? await supabase.from("trails").update(row).eq("id", id).select("id").single() : await supabase.from("trails").insert(row).select("id").single();
  if (res.error) return { error: res.error.message };
  const trailId = res.data.id as string;
  await supabase.from("trail_job_roles").delete().eq("trail_id", trailId);
  const roles = ids(form, "job_role_ids");
  if (roles.length) await supabase.from("trail_job_roles").insert(roles.map((r) => ({ trail_id: trailId, job_role_id: r })));
  done();
  if (!id) redirect(`/admin/trilhas/${trailId}`);
  return { success: "Trilha salva." };
}

export async function deleteTrail(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("trails").delete().eq("id", str(form, "id"));
  done();
  redirect("/admin/trilhas");
}

export async function addTrailCourse(form: FormData) {
  const { supabase } = await requireAdmin();
  const trailId = str(form, "trail_id");
  const courseId = str(form, "course_id");
  if (!courseId) return;
  await supabase.from("trail_courses").upsert({ trail_id: trailId, course_id: courseId, position: intOr(str(form, "position"), 99), required: form.get("required") !== "off" });
  done();
}

export async function updateTrailCourse(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("trail_courses")
    .update({ position: intOr(str(form, "position")), required: form.get("required") === "on" })
    .eq("trail_id", str(form, "trail_id"))
    .eq("course_id", str(form, "course_id"));
  done();
}

export async function removeTrailCourse(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("trail_courses").delete().eq("trail_id", str(form, "trail_id")).eq("course_id", str(form, "course_id"));
  done();
}

// ---------------- Cursos ----------------
export async function saveCourse(_: AdminState, form: FormData): Promise<AdminState> {
  const { supabase, profile } = await requireAdmin();
  const id = str(form, "id");
  const title = str(form, "title");
  if (!title) return { error: "Informe o título." };
  const marketplace = str(form, "marketplace") === "1";
  if (marketplace && !profile.is_super_admin) return { error: "Só o super admin do PestX edita cursos do marketplace." };
  const price = numOrNull(str(form, "price").replace(/[^\d,.]/g, "").replace(/\.(?=\d{3}(\D|$))/g, ""));
  if (marketplace && (!price || price < 5)) return { error: "Informe o preço (mínimo R$ 5,00)." };
  const audience = marketplace ? "all" : str(form, "audience") === "roles" ? "roles" : "all";
  let cover: string | null, material: string | null;
  try {
    const folder = marketplace ? "plataforma" : folderOf(profile);
    cover = await fileField(form, "cover", "image", folder);
    material = await fileField(form, "material", "pdf", folder);
  } catch (e) { const m = uploadMsg(e); if (m) return { error: m }; throw e; }
  const slugBase = slugify(str(form, "slug") || title);
  const row: Record<string, unknown> = {
    title,
    slug: slugBase,
    subtitle: strOrNull(form, "subtitle"),
    description: strOrNull(form, "description"),
    cover_url: cover,
    material_url: material,
    ...(marketplace ? { price } : {}),
    category_id: strOrNull(form, "category_id"),
    audience,
    workload_hours: numOrNull(str(form, "workload_hours")),
    certificate_enabled: form.get("certificate_enabled") === "on",
    is_featured: form.get("is_featured") === "on",
    is_published: form.get("is_published") === "on",
    position: intOr(str(form, "position")),
  };
  const insertRow = marketplace ? { ...row, company_id: null, is_marketplace: true } : row;
  let res = id ? await supabase.from("courses").update(row).eq("id", id).select("id").single() : await supabase.from("courses").insert(insertRow).select("id").single();
  if (res.error?.code === "23505" && !id && !str(form, "slug")) {
    // o endereço é único entre todas as empresas: acrescenta um sufixo
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
    res = await supabase.from("courses").insert({ ...insertRow, slug }).select("id").single();
  }
  if (res.error) return { error: res.error.code === "23505" ? "Já existe um curso com esse endereço (slug). Troque o endereço." : res.error.message };
  const courseId = res.data.id as string;
  await supabase.from("course_job_roles").delete().eq("course_id", courseId);
  const roles = ids(form, "job_role_ids");
  if (!marketplace && audience === "roles" && roles.length) await supabase.from("course_job_roles").insert(roles.map((r) => ({ course_id: courseId, job_role_id: r })));
  await supabase.from("course_instructors").delete().eq("course_id", courseId);
  const inst = ids(form, "instructor_ids");
  if (inst.length) await supabase.from("course_instructors").insert(inst.map((iid, i) => ({ course_id: courseId, instructor_id: iid, position: i })));
  done();
  if (!id) redirect(`/admin/cursos/${courseId}`);
  return { success: "Curso salvo!" };
}

export async function deleteCourse(form: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("courses").delete().eq("id", str(form, "id"));
  done();
  // curso do marketplace já vendido não pode ser apagado (pedidos ficam guardados)
  if (error) redirect(`/admin/cursos/${str(form, "id")}?erro=${encodeURIComponent("Este curso já foi vendido e não pode ser excluído. Tire de venda (desmarque \"À venda\").")}`);
  redirect(form.get("marketplace") ? "/admin/marketplace" : "/admin/cursos");
}

export async function saveModule(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(form, "id");
  const row = { title: str(form, "title") || "Novo módulo", position: intOr(str(form, "position")), course_id: str(form, "course_id") };
  if (id) await supabase.from("modules").update(row).eq("id", id);
  else await supabase.from("modules").insert(row);
  done();
}

export async function deleteModule(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("modules").delete().eq("id", str(form, "id"));
  done();
}

export async function saveLesson(_: AdminState, form: FormData): Promise<AdminState> {
  const { supabase, profile } = await requireAdmin();
  const id = str(form, "id");
  const courseId = str(form, "course_id");
  const title = str(form, "title");
  if (!title) return { error: "Informe o título da aula." };
  const { data: co } = await supabase.from("courses").select("is_marketplace").eq("id", courseId).maybeSingle();
  let attachment: string | null;
  try { attachment = await fileField(form, "attachment", "doc", co?.is_marketplace ? "plataforma" : folderOf(profile)); }
  catch (e) { const m = uploadMsg(e); if (m) return { error: m }; throw e; }
  const row = {
    module_id: str(form, "module_id"),
    course_id: courseId,
    title,
    description: strOrNull(form, "description"),
    video_url: strOrNull(form, "video_url"),
    content: strOrNull(form, "content"),
    attachment_url: attachment,
    duration_minutes: str(form, "duration_minutes") ? intOr(str(form, "duration_minutes")) : null,
    position: intOr(str(form, "position")),
  };
  const { error } = id ? await supabase.from("lessons").update(row).eq("id", id) : await supabase.from("lessons").insert(row);
  if (error) return { error: error.message };
  done();
  redirect(`/admin/cursos/${courseId}`);
}

export async function deleteLesson(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("lessons").delete().eq("id", str(form, "id"));
  done();
  redirect(`/admin/cursos/${str(form, "course_id")}`);
}

// ---------------- Quiz e prova ----------------
export async function saveQuiz(_: AdminState, form: FormData): Promise<AdminState> {
  const { supabase } = await requireAdmin();
  const id = str(form, "id");
  const courseId = str(form, "course_id");
  const lessonId = strOrNull(form, "lesson_id");
  const row = {
    course_id: courseId,
    lesson_id: lessonId,
    kind: lessonId ? "quiz" : str(form, "kind") === "quiz" ? "quiz" : "exam",
    title: str(form, "title") || (lessonId ? "Quiz da aula" : "Prova final"),
    description: strOrNull(form, "description"),
    passing_score: Math.min(100, Math.max(0, intOr(str(form, "passing_score"), 70))),
    max_attempts: str(form, "max_attempts") ? intOr(str(form, "max_attempts")) : null,
    time_limit_minutes: str(form, "time_limit_minutes") ? intOr(str(form, "time_limit_minutes")) : null,
    show_answers: form.get("show_answers") === "on",
    is_published: form.get("is_published") === "on",
  };
  const res = id ? await supabase.from("quizzes").update(row).eq("id", id).select("id").single() : await supabase.from("quizzes").insert(row).select("id").single();
  if (res.error) return { error: res.error.message };
  done();
  if (!id) redirect(`/admin/cursos/${courseId}/avaliacoes/${res.data.id}`);
  return { success: "Avaliação salva." };
}

export async function deleteQuiz(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("quizzes").delete().eq("id", str(form, "id"));
  done();
  redirect(`/admin/cursos/${str(form, "course_id")}`);
}

/** Opções: uma por linha; a correta começa com * (ex.: "*Paris"). */
export async function saveQuestion(_: AdminState, form: FormData): Promise<AdminState> {
  const { supabase } = await requireAdmin();
  const id = str(form, "id");
  const quizId = str(form, "quiz_id");
  const prompt = str(form, "prompt");
  const lines = str(form, "options").split("\n").map((l) => l.trim()).filter(Boolean);
  const correct = lines.filter((l) => l.startsWith("*")).length;
  if (!prompt) return { error: "Escreva a pergunta." };
  if (lines.length < 2) return { error: "Coloque pelo menos 2 alternativas, uma por linha." };
  if (correct !== 1) return { error: "Marque exatamente 1 alternativa correta com * no início." };
  const row = { quiz_id: quizId, prompt, explanation: strOrNull(form, "explanation"), position: intOr(str(form, "position")) };
  const res = id ? await supabase.from("quiz_questions").update(row).eq("id", id).select("id").single() : await supabase.from("quiz_questions").insert(row).select("id").single();
  if (res.error) return { error: res.error.message };
  const qid = res.data.id as string;
  await supabase.from("quiz_options").delete().eq("question_id", qid);
  await supabase.from("quiz_options").insert(lines.map((l, i) => ({ question_id: qid, text: l.replace(/^\*\s*/, ""), is_correct: l.startsWith("*"), position: i })));
  done();
  return { success: id ? "Questão atualizada." : "Questão adicionada." };
}

export async function deleteQuestion(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("quiz_questions").delete().eq("id", str(form, "id"));
  done();
}

// ---------------- Categorias, instrutores e biblioteca ----------------
export async function saveCategory(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(form, "id");
  const row = { name: str(form, "name"), position: intOr(str(form, "position")) };
  if (!row.name) return;
  if (id) await supabase.from("categories").update(row).eq("id", id);
  else await supabase.from("categories").insert(row);
  done();
}

export async function deleteCategory(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("categories").delete().eq("id", str(form, "id"));
  done();
}

export async function saveInstructor(form: FormData) {
  const { supabase, profile } = await requireAdmin();
  const id = str(form, "id");
  let avatar: string | null = null;
  try { avatar = await fileField(form, "avatar", "image", folderOf(profile)); } catch (e) { backWithError("/admin/catalogo", e); }
  const row = { name: str(form, "name"), title: strOrNull(form, "title"), avatar_url: avatar, bio: strOrNull(form, "bio") };
  if (!row.name) return;
  if (id) await supabase.from("instructors").update(row).eq("id", id);
  else await supabase.from("instructors").insert(row);
  done();
}

export async function deleteInstructor(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("instructors").delete().eq("id", str(form, "id"));
  done();
}

export async function saveLibraryItem(form: FormData) {
  const { supabase, profile } = await requireAdmin();
  const id = str(form, "id");
  let file: string | null = null, cover: string | null = null;
  try {
    file = await fileField(form, "file", "doc", folderOf(profile));
    cover = await fileField(form, "cover", "image", folderOf(profile));
  } catch (e) { backWithError("/admin/biblioteca", e); }
  const row = {
    title: str(form, "title"),
    author: strOrNull(form, "author"),
    description: strOrNull(form, "description"),
    cover_url: cover,
    file_url: file,
    category: strOrNull(form, "category"),
    position: intOr(str(form, "position")),
  };
  if (!row.title) return;
  if (id) await supabase.from("library_items").update(row).eq("id", id);
  else await supabase.from("library_items").insert(row);
  done();
}

export async function deleteLibraryItem(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("library_items").delete().eq("id", str(form, "id"));
  done();
}

// ---------------- Eventos ----------------
export async function saveEvent(_: AdminState, form: FormData): Promise<AdminState> {
  const { supabase, user, profile } = await requireAdmin();
  let cover: string | null;
  try { cover = await fileField(form, "cover", "image", folderOf(profile)); } catch (e) { const m = uploadMsg(e); if (m) return { error: m }; throw e; }
  const id = str(form, "id");
  const startsAt = localInputToIso(str(form, "starts_at"));
  if (!str(form, "title") || !startsAt) return { error: "Informe título e data de início." };
  const row = {
    title: str(form, "title"),
    description: strOrNull(form, "description"),
    host: strOrNull(form, "host"),
    starts_at: startsAt,
    ends_at: localInputToIso(str(form, "ends_at")),
    location: strOrNull(form, "location"),
    meeting_url: strOrNull(form, "meeting_url"),
    cover_url: cover,
    is_published: form.get("is_published") === "on",
  };
  const { error } = id ? await supabase.from("events").update(row).eq("id", id) : await supabase.from("events").insert({ ...row, created_by: user.id });
  if (error) return { error: error.message };
  done();
  redirect("/admin/eventos");
}

export async function deleteEvent(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("events").delete().eq("id", str(form, "id"));
  done();
  redirect("/admin/eventos");
}

// ---------------- Comunidade (espaços) ----------------
export async function saveSpace(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(form, "id");
  const name = str(form, "name");
  if (!name) return;
  const row = { name, slug: slugify(str(form, "slug") || name), description: strOrNull(form, "description"), admin_only_posts: form.get("admin_only_posts") === "on", position: intOr(str(form, "position")) };
  if (id) await supabase.from("spaces").update(row).eq("id", id);
  else await supabase.from("spaces").insert(row);
  done();
}

export async function deleteSpace(form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("spaces").delete().eq("id", str(form, "id"));
  done();
}

export async function createExam(form: FormData) {
  const { supabase } = await requireAdmin();
  const courseId = str(form, "course_id");
  const { data, error } = await supabase
    .from("quizzes")
    .insert({ course_id: courseId, kind: "exam", title: "Prova final", passing_score: 70, max_attempts: 3, show_answers: false, is_published: false })
    .select("id")
    .single();
  if (error) return;
  done();
  redirect(`/admin/cursos/${courseId}/avaliacoes/${data.id}`);
}
