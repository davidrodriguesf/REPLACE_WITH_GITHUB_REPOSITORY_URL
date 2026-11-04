import "server-only";
import type { Db as SupabaseClient } from "@/lib/db/client";

export type ReportRow = {
  user_id: string;
  course_id: string;
  title: string;
  slug: string;
  total_lessons: number;
  done_lessons: number;
  last_activity: string | null;
  assigned: boolean;
  due_date: string | null;
  in_trail: boolean;
  certificate_id: string | null;
  best_exam: number | null;
  exam_passed: boolean | null;
};

export async function getReport(supabase: SupabaseClient, onlyUser?: string) {
  const { data } = await supabase.rpc("learning_report", onlyUser ? { only_user: onlyUser } : {});
  return (data ?? []) as ReportRow[];
}

export const rowDone = (r: ReportRow) => r.total_lessons > 0 && r.done_lessons >= r.total_lessons;

/** Resumo por colaborador: obrigatórios (trilha + atribuídos) concluídos, horas etc. */
export function summarize(rows: ReportRow[]) {
  const by = new Map<string, { required: number; requiredDone: number; started: number; certificates: number; overdue: number; last: string | null }>();
  const today = new Date().toISOString().slice(0, 10);
  for (const r of rows) {
    const s = by.get(r.user_id) ?? { required: 0, requiredDone: 0, started: 0, certificates: 0, overdue: 0, last: null };
    const req = r.in_trail || r.assigned;
    if (req) s.required++;
    if (req && rowDone(r)) s.requiredDone++;
    if (r.done_lessons > 0) s.started++;
    if (r.certificate_id) s.certificates++;
    if (r.due_date && r.due_date < today && !rowDone(r)) s.overdue++;
    if (r.last_activity && (!s.last || r.last_activity > s.last)) s.last = r.last_activity;
    by.set(r.user_id, s);
  }
  return by;
}
