import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Course } from "@/lib/types";

export type CourseStatus = "enrolled" | "pending" | "free_locked" | "paid_locked";
export type CatalogCourse = Course & { status: CourseStatus; totalLessons: number; doneLessons: number };

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

  const totals = new Map<string, number>();
  const done = new Map<string, number>();
  if (accessible.length) {
    const [{ data: lessons }, { data: progress }] = await Promise.all([
      supabase.from("lessons").select("id, course_id").in("course_id", accessible),
      supabase.from("lesson_progress").select("lesson_id").eq("user_id", userId),
    ]);
    const doneIds = new Set((progress ?? []).map((p) => p.lesson_id as string));
    for (const l of lessons ?? []) {
      totals.set(l.course_id, (totals.get(l.course_id) ?? 0) + 1);
      if (doneIds.has(l.id)) done.set(l.course_id, (done.get(l.course_id) ?? 0) + 1);
    }
  }

  return list.map((c) => ({
    ...c,
    status: isAdmin || enrolled.has(c.id) ? "enrolled" : pending.has(c.id) ? "pending" : c.access_type === "free" ? "free_locked" : "paid_locked",
    totalLessons: totals.get(c.id) ?? 0,
    doneLessons: done.get(c.id) ?? 0,
  }));
}
