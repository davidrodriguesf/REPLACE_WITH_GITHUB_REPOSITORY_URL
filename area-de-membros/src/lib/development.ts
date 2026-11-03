import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Goal, Plan } from "@/lib/types";

export type PlanWithGoals = Plan & { goals: Goal[]; pct: number; doneGoals: number };

export async function getPlans(supabase: SupabaseClient, userId: string): Promise<PlanWithGoals[]> {
  const { data: plans } = await supabase.from("development_plans").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  const ids = (plans ?? []).map((p) => p.id as string);
  const { data: goals } = ids.length ? await supabase.from("plan_goals").select("*").in("plan_id", ids).order("position") : { data: [] };
  return ((plans ?? []) as Plan[]).map((p) => {
    const g = ((goals ?? []) as Goal[]).filter((x) => x.plan_id === p.id);
    const done = g.filter((x) => x.status === "done").length;
    return { ...p, goals: g, doneGoals: done, pct: g.length ? Math.round((done / g.length) * 100) : p.status === "completed" ? 100 : 0 };
  });
}

/** Números do colaborador: cursos, horas, certificados e média das provas. */
export async function getStats(supabase: SupabaseClient, userId: string) {
  const [{ data: progress }, { data: certs }, { data: attempts }] = await Promise.all([
    supabase.from("lesson_progress").select("lesson_id, lessons(duration_minutes)").eq("user_id", userId),
    supabase.from("certificates").select("id, hours").eq("user_id", userId),
    supabase.from("quiz_attempts").select("quiz_id, score, passed, quizzes(kind)").eq("user_id", userId),
  ]);
  const minutes = ((progress ?? []) as unknown as { lessons: { duration_minutes: number | null } | null }[]).reduce((s, p) => s + (p.lessons?.duration_minutes ?? 0), 0);
  const best = new Map<string, number>();
  for (const a of (attempts ?? []) as unknown as { quiz_id: string; score: number; quizzes: { kind: string } | null }[]) {
    if (a.quizzes?.kind !== "exam") continue;
    best.set(a.quiz_id, Math.max(best.get(a.quiz_id) ?? 0, a.score));
  }
  const avg = best.size ? Math.round([...best.values()].reduce((s, n) => s + n, 0) / best.size) : null;
  return { lessonsDone: progress?.length ?? 0, hours: Math.round((minutes / 60) * 10) / 10, certificates: certs?.length ?? 0, examAvg: avg, examsTaken: best.size };
}

export const goalStatusLabel: Record<Goal["status"], string> = { todo: "A fazer", doing: "Em andamento", done: "Concluída" };
export const planStatusLabel: Record<Plan["status"], string> = { active: "Em andamento", completed: "Concluído", cancelled: "Cancelado" };
