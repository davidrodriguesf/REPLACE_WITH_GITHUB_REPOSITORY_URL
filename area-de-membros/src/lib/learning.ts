import "server-only";
import type { Db as SupabaseClient } from "@/lib/db/client";
import type { Course, Instructor, Trail } from "@/lib/types";

export type LearnCourse = Course & {
  categoryName: string | null;
  instructors: Instructor[];
  moduleCount: number;
  totalLessons: number;
  doneLessons: number;
  totalMinutes: number;
  pct: number;
  completed: boolean;
  started: boolean;
  nextLesson: { id: string; title: string; number: number } | null;
  lastActivity: string | null;
  dueDate: string | null; // atribuída individualmente com prazo
  assigned: boolean;
  certificateId: string | null;
  hasExam: boolean;
};

export type LearnTrail = Trail & {
  roleNames: string[];
  steps: { course: LearnCourse; required: boolean }[];
  doneCount: number;
  pct: number;
  next: LearnCourse | null;
};

/** Tudo o que o colaborador pode estudar, com o progresso dele. O RLS já filtra os cursos permitidos. */
export async function getLearning(supabase: SupabaseClient, userId: string) {
  const [{ data: courses }, { data: categories }, { data: ci }, { data: assigns }, { data: certs }, { data: progress }, { data: exams }] = await Promise.all([
    supabase.from("courses").select("*").eq("is_published", true).order("position").order("created_at"),
    supabase.from("categories").select("*").order("position"),
    supabase.from("course_instructors").select("course_id, position, instructors(*)").order("position"),
    supabase.from("assignments").select("course_id, due_date").eq("user_id", userId),
    supabase.from("certificates").select("id, course_id").eq("user_id", userId),
    supabase.from("lesson_progress").select("lesson_id, completed_at").eq("user_id", userId),
    supabase.from("quizzes").select("course_id").eq("kind", "exam").eq("is_published", true),
  ]);
  // cursos do marketplace só aparecem para quem estuda se a empresa comprou (o super admin enxerga todos para editar)
  const { data: myCompany } = await supabase.rpc("my_company");
  const { data: lic } = await supabase.from("course_licenses").select("course_id").eq("company_id", myCompany);
  const licensed = new Set((lic ?? []).map((l) => l.course_id as string));
  const list = ((courses ?? []) as Course[]).filter((c) => !c.is_marketplace || licensed.has(c.id));
  const ids = list.map((c) => c.id);
  const [{ data: modules }, { data: lessons }] = ids.length
    ? await Promise.all([
        supabase.from("modules").select("id, course_id, position").in("course_id", ids),
        supabase.from("lessons").select("id, course_id, module_id, title, position, duration_minutes").in("course_id", ids),
      ])
    : [{ data: [] }, { data: [] }];

  const catName = new Map((categories ?? []).map((c) => [c.id as string, c.name as string]));
  const instr = new Map<string, Instructor[]>();
  for (const row of (ci ?? []) as unknown as { course_id: string; instructors: Instructor | null }[]) {
    if (!row.instructors) continue;
    if (!instr.has(row.course_id)) instr.set(row.course_id, []);
    instr.get(row.course_id)!.push(row.instructors);
  }
  const due = new Map((assigns ?? []).map((a) => [a.course_id as string, (a.due_date as string | null) ?? null]));
  const cert = new Map((certs ?? []).map((c) => [c.course_id as string, c.id as string]));
  const doneAt = new Map((progress ?? []).map((p) => [p.lesson_id as string, p.completed_at as string]));
  const examSet = new Set((exams ?? []).map((e) => e.course_id as string));
  const modPos = new Map((modules ?? []).map((m) => [m.id as string, m.position as number]));
  const modCount = new Map<string, number>();
  for (const m of modules ?? []) modCount.set(m.course_id, (modCount.get(m.course_id) ?? 0) + 1);

  type L = { id: string; course_id: string; module_id: string; title: string; position: number; duration_minutes: number | null };
  const byCourse = new Map<string, L[]>();
  for (const l of (lessons ?? []) as L[]) {
    if (!byCourse.has(l.course_id)) byCourse.set(l.course_id, []);
    byCourse.get(l.course_id)!.push(l);
  }
  for (const arr of byCourse.values()) arr.sort((a, b) => (modPos.get(a.module_id) ?? 0) - (modPos.get(b.module_id) ?? 0) || a.position - b.position);

  const result: LearnCourse[] = list.map((c) => {
    const ls = byCourse.get(c.id) ?? [];
    const done = ls.filter((l) => doneAt.has(l.id)).length;
    const idx = ls.findIndex((l) => !doneAt.has(l.id));
    const next = ls[idx >= 0 ? idx : 0];
    const dates = ls.map((l) => doneAt.get(l.id)).filter(Boolean) as string[];
    return {
      ...c,
      categoryName: c.category_id ? catName.get(c.category_id) ?? null : null,
      instructors: instr.get(c.id) ?? [],
      moduleCount: modCount.get(c.id) ?? 0,
      totalLessons: ls.length,
      doneLessons: done,
      totalMinutes: ls.reduce((s, l) => s + (l.duration_minutes ?? 0), 0),
      pct: ls.length ? Math.round((done / ls.length) * 100) : 0,
      completed: ls.length > 0 && done === ls.length,
      started: done > 0,
      nextLesson: next ? { id: next.id, title: next.title, number: (idx >= 0 ? idx : 0) + 1 } : null,
      lastActivity: dates.sort().pop() ?? null,
      dueDate: due.get(c.id) ?? null,
      assigned: due.has(c.id),
      certificateId: cert.get(c.id) ?? null,
      hasExam: examSet.has(c.id),
    };
  });
  return { courses: result, byId: new Map(result.map((c) => [c.id, c])), categories: (categories ?? []) as { id: string; name: string }[] };
}

/** Trilhas da função do colaborador (o RLS já filtra). */
export async function getTrails(supabase: SupabaseClient, byId: Map<string, LearnCourse>): Promise<LearnTrail[]> {
  const [{ data: trails }, { data: tc }, { data: tr }] = await Promise.all([
    supabase.from("trails").select("*").order("position"),
    supabase.from("trail_courses").select("*").order("position"),
    supabase.from("trail_job_roles").select("trail_id, job_roles(name)"),
  ]);
  return ((trails ?? []) as Trail[]).map((t) => {
    const steps = (tc ?? [])
      .filter((x) => x.trail_id === t.id && byId.has(x.course_id))
      .map((x) => ({ course: byId.get(x.course_id)!, required: x.required as boolean }));
    const doneCount = steps.filter((s) => s.course.completed).length;
    return {
      ...t,
      roleNames: (tr ?? []).filter((x) => x.trail_id === t.id).map((x) => (x.job_roles as unknown as { name: string } | null)?.name).filter(Boolean) as string[],
      steps,
      doneCount,
      pct: steps.length ? Math.round((doneCount / steps.length) * 100) : 0,
      next: steps.find((s) => !s.course.completed)?.course ?? null,
    };
  });
}

export function courseHref(c: Pick<LearnCourse, "slug">) {
  return `/cursos/${c.slug}`;
}

export function formatMinutes(min: number) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m ? `${m}` : ""}` : `${m}min`;
}
