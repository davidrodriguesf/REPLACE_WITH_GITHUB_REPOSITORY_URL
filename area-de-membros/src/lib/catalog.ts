import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Course } from "@/lib/types";

export type CourseStatus = "enrolled" | "pending" | "free_locked" | "paid_locked";
export type CatalogCourse = Course & {
  status: CourseStatus;
  totalLessons: number;
  doneLessons: number;
  totalMinutes: number;
  /** próxima aula não concluída (ou a primeira), para o botão "Continuar" */
  nextLesson: { id: string; title: string; number: number } | null;
  lastActivity: string | null;
};

export async function getCatalog(supabase: SupabaseClient, userId: string, isAdmin: boolean): Promise<CatalogCourse[]> {
  const [{ data: courses }, { data: enrollments }, { data: requests }] = await Promise.all([
    supabase.from("courses").select("*").eq("is_published", true).order("position").order("created_at"),
    supabase.from("enrollments").select("course_id, expires_at").eq("user_id", userId),
    supabase.from("access_requests").select("course_id, status").eq("user_id", userId),
  ]);

  const now = Date.now();
  const enrolled = new Set(
    (enrollments ?? []).filter((e) => !e.expires_at || new Date(e.expires_at).getTime() > now).map((e) => e.course_id as string),
  );
  const pending = new Set((requests ?? []).filter((r) => r.status === "pending").map((r) => r.course_id as string));
  const list = (courses ?? []) as Course[];
  const accessible = list.filter((c) => isAdmin || enrolled.has(c.id)).map((c) => c.id);

  type L = { id: string; course_id: string; module_id: string; title: string; position: number; duration_minutes: number | null };
  const byCourse = new Map<string, L[]>();
  const doneAt = new Map<string, string>();
  if (accessible.length) {
    const [{ data: modules }, { data: lessons }, { data: progress }] = await Promise.all([
      supabase.from("modules").select("id, course_id, position").in("course_id", accessible),
      supabase.from("lessons").select("id, course_id, module_id, title, position, duration_minutes").in("course_id", accessible),
      supabase.from("lesson_progress").select("lesson_id, completed_at").eq("user_id", userId),
    ]);
    const modPos = new Map((modules ?? []).map((m) => [m.id as string, m.position as number]));
    for (const p of progress ?? []) doneAt.set(p.lesson_id, p.completed_at);
    for (const l of (lessons ?? []) as L[]) {
      if (!byCourse.has(l.course_id)) byCourse.set(l.course_id, []);
      byCourse.get(l.course_id)!.push(l);
    }
    for (const arr of byCourse.values())
      arr.sort((a, b) => (modPos.get(a.module_id) ?? 0) - (modPos.get(b.module_id) ?? 0) || a.position - b.position);
  }

  return list.map((c) => {
    const ls = byCourse.get(c.id) ?? [];
    const idx = ls.findIndex((l) => !doneAt.has(l.id));
    const next = ls[idx >= 0 ? idx : 0];
    const dates = ls.map((l) => doneAt.get(l.id)).filter(Boolean) as string[];
    return {
      ...c,
      status: isAdmin || enrolled.has(c.id) ? "enrolled" : pending.has(c.id) ? "pending" : c.access_type === "free" ? "free_locked" : "paid_locked",
      totalLessons: ls.length,
      doneLessons: ls.filter((l) => doneAt.has(l.id)).length,
      totalMinutes: ls.reduce((s, l) => s + (l.duration_minutes ?? 0), 0),
      nextLesson: next ? { id: next.id, title: next.title, number: (idx >= 0 ? idx : 0) + 1 } : null,
      lastActivity: dates.sort().pop() ?? null,
    };
  });
}

export function formatMinutes(min: number) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m ? ` ${m}min` : ""}` : `${m}min`;
}
