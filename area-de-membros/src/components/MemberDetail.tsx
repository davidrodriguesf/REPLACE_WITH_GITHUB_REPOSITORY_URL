import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getReport, rowDone } from "@/lib/reports";
import { getPlans, planStatusLabel } from "@/lib/development";
import { removeAssignment } from "@/app/(app)/equipe/actions";
import { Avatar } from "./Avatar";
import { ProgressBar } from "./Cards";
import { ConfirmButton } from "./ui";
import { AssignCourseForm, CreatePlanForm } from "./MemberForms";
import { IconAward } from "./Icons";
import { formatDate, formatDateTime, timeAgo } from "@/lib/utils";
import type { Profile } from "@/lib/types";

/** Visão completa do desenvolvimento de um colaborador (gestor e RH). */
export async function MemberDetail({ supabase, member, jobRole }: { supabase: SupabaseClient; member: Profile; jobRole: string | null }) {
  const [rows, plans, { data: attempts }, { data: assignments }, { data: allCourses }] = await Promise.all([
    getReport(supabase, member.id),
    getPlans(supabase, member.id),
    supabase.from("quiz_attempts").select("id, score, passed, submitted_at, quizzes(title, kind)").eq("user_id", member.id).order("submitted_at", { ascending: false }).limit(10),
    supabase.from("assignments").select("id, due_date, courses(title)").eq("user_id", member.id),
    supabase.from("courses").select("id, title").eq("is_published", true).order("title"),
  ]);
  const required = rows.filter((r) => r.in_trail || r.assigned);
  const reqDone = required.filter(rowDone).length;
  const pct = required.length ? Math.round((reqDone / required.length) * 100) : 0;
  const last = rows.map((r) => r.last_activity).filter(Boolean).sort().pop() as string | undefined;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={member.full_name} url={member.avatar_url} size={72} square />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-950">{member.full_name}</h1>
          <p className="text-slate-500">{[jobRole, member.department].filter(Boolean).join(" · ") || "Sem função definida"} · {member.email}</p>
          <p className="text-sm text-slate-400">{last ? `Última atividade ${timeAgo(last)}` : "Ainda não começou a estudar"}{!member.is_active ? " · INATIVO" : ""}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Trilha e obrigatórios", `${pct}%`],
          ["Cursos concluídos", rows.filter(rowDone).length],
          ["Certificados", rows.filter((r) => r.certificate_id).length],
          ["PDIs ativos", plans.filter((p) => p.status === "active").length],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-2xl bg-slate-50 p-5">
            <p className="text-3xl font-extrabold text-navy-950 tabular-nums">{v}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{k}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="h-row mb-4">Cursos</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="table min-w-[640px]">
            <thead><tr><th>Curso</th><th>Progresso</th><th>Prova</th><th>Certificado</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const p = r.total_lessons ? Math.round((r.done_lessons / r.total_lessons) * 100) : 0;
                const overdue = r.due_date && r.due_date < today && !rowDone(r);
                return (
                  <tr key={r.course_id}>
                    <td>
                      <p className="font-semibold text-navy-950">{r.title}</p>
                      <p className="text-xs text-slate-500">
                        {r.in_trail ? "Trilha" : r.assigned ? "Atribuído" : "Por iniciativa própria"}
                        {r.due_date ? ` · prazo ${formatDate(r.due_date)}` : ""}
                        {overdue ? <span className="font-bold text-red-600"> · atrasado</span> : null}
                      </p>
                    </td>
                    <td className="w-48"><div className="flex items-center gap-2"><ProgressBar pct={p} className="flex-1" /><span className="text-xs font-semibold tabular-nums">{p}%</span></div></td>
                    <td>{r.best_exam == null ? <span className="text-slate-400">—</span> : <span className={r.exam_passed ? "font-semibold text-emerald-700" : "text-amber-700"}>{r.best_exam}%</span>}</td>
                    <td>{r.certificate_id ? <span className="inline-flex items-center gap-1 text-emerald-700"><IconAward className="w-4 h-4" />Emitido</span> : <span className="text-slate-400">—</span>}</td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={4} className="py-6 text-center text-slate-500">Nenhum curso na trilha ou atribuído.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="h-row">Planos de desenvolvimento</h2>
          {plans.map((p) => (
            <Link key={p.id} href={`/desenvolvimento/pdi/${p.id}`} className="block rounded-2xl border border-slate-200 p-4 hover:shadow-md">
              <p className="font-bold text-navy-950">{p.title}</p>
              <p className="text-sm text-slate-500">{planStatusLabel[p.status]} · {p.doneGoals}/{p.goals.length} metas{p.due_date ? ` · até ${formatDate(p.due_date)}` : ""}</p>
              <ProgressBar pct={p.pct} className="mt-3" />
            </Link>
          ))}
          <details className="rounded-2xl border border-dashed border-slate-300 p-4" open={!plans.length}>
            <summary className="cursor-pointer font-bold text-navy-950">+ Novo PDI</summary>
            <div className="mt-4"><CreatePlanForm userId={member.id} /></div>
          </details>
        </section>

        <section className="space-y-4">
          <h2 className="h-row">Atribuir curso</h2>
          <div className="rounded-2xl border border-slate-200 p-4"><AssignCourseForm userId={member.id} courses={(allCourses ?? []) as { id: string; title: string }[]} /></div>
          {!!assignments?.length && (
            <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {(assignments as unknown as { id: string; due_date: string | null; courses: { title: string } | null }[]).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0"><span className="block font-semibold text-navy-950 truncate">{a.courses?.title}</span><span className="text-xs text-slate-500">{a.due_date ? `Prazo ${formatDate(a.due_date)}` : "Sem prazo"}</span></span>
                  <form action={removeAssignment}>
                    <input type="hidden" name="assignment_id" value={a.id} />
                    <ConfirmButton message="Remover esta atribuição?" variant="ghost" className="btn-sm">Remover</ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <h2 className="h-row pt-4">Avaliações recentes</h2>
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {((attempts ?? []) as unknown as { id: string; score: number; passed: boolean; submitted_at: string; quizzes: { title: string; kind: string } | null }[]).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0"><span className="block font-semibold text-navy-950 truncate">{a.quizzes?.title}</span><span className="text-xs text-slate-500">{a.quizzes?.kind === "exam" ? "Prova" : "Quiz"} · {formatDateTime(a.submitted_at)}</span></span>
                <span className={`font-bold ${a.passed ? "text-emerald-700" : "text-amber-700"}`}>{a.score}%</span>
              </li>
            ))}
            {!attempts?.length && <li className="px-4 py-3 text-sm text-slate-500">Nenhuma avaliação feita.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
