import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getReport, rowDone, summarize } from "@/lib/reports";
import { ProgressBar } from "@/components/Cards";
import { timeAgo } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Relatórios" };

export default async function Relatorios({ searchParams }: { searchParams: Promise<{ funcao?: string; depto?: string; filtro?: string }> }) {
  const { funcao = "", depto = "", filtro = "" } = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: people }, { data: roles }, rows, { data: attempts }] = await Promise.all([
    supabase.from("profiles").select("*").eq("is_active", true).order("full_name"),
    supabase.from("job_roles").select("id, name").order("name"),
    getReport(supabase),
    supabase.from("quiz_attempts").select("user_id, quiz_id, score, quizzes(kind)"),
  ]);
  const roleName = new Map((roles ?? []).map((r) => [r.id as string, r.name as string]));
  const sum = summarize(rows);
  const best = new Map<string, Map<string, number>>();
  for (const a of (attempts ?? []) as unknown as { user_id: string; quiz_id: string; score: number; quizzes: { kind: string } | null }[]) {
    if (a.quizzes?.kind !== "exam") continue;
    const m = best.get(a.user_id) ?? new Map();
    m.set(a.quiz_id, Math.max(m.get(a.quiz_id) ?? 0, a.score));
    best.set(a.user_id, m);
  }
  const depts = [...new Set(((people ?? []) as Profile[]).map((p) => p.department).filter(Boolean))] as string[];
  const list = ((people ?? []) as Profile[]).filter(
    (p) => (!funcao || p.job_role_id === funcao) && (!depto || p.department === depto) && (filtro !== "atrasados" || (sum.get(p.id)?.overdue ?? 0) > 0),
  );
  const qs = new URLSearchParams({ ...(funcao && { funcao }), ...(depto && { depto }), ...(filtro && { filtro }) }).toString();

  // Cursos: conclusão entre quem deveria fazer
  const byCourse = new Map<string, { title: string; req: number; done: number }>();
  for (const r of rows) {
    if (!(r.in_trail || r.assigned)) continue;
    const c = byCourse.get(r.course_id) ?? { title: r.title, req: 0, done: 0 };
    c.req++;
    if (rowDone(r)) c.done++;
    byCourse.set(r.course_id, c);
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="h-row">Progresso por colaborador</h1>
          <a href={`/admin/relatorios/csv${qs ? `?${qs}` : ""}`} className="btn btn-light btn-sm">Exportar CSV (Excel)</a>
        </div>
        <form className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <select className="input" name="funcao" defaultValue={funcao}>
            <option value="">Todas as funções</option>
            {(roles ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select className="input" name="depto" defaultValue={depto}>
            <option value="">Todos os departamentos</option>
            {depts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="input" name="filtro" defaultValue={filtro}>
            <option value="">Todos</option>
            <option value="atrasados">Só com obrigatórios atrasados</option>
          </select>
          <button className="btn btn-secondary">Filtrar</button>
        </form>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="table min-w-[860px]">
            <thead><tr><th>Colaborador</th><th>Função</th><th>Obrigatórios</th><th>Concluídos</th><th>Certificados</th><th>Média provas</th><th>Atrasados</th><th>Última atividade</th></tr></thead>
            <tbody>
              {list.map((p) => {
                const s = sum.get(p.id);
                const pct = s?.required ? Math.round((s.requiredDone / s.required) * 100) : 0;
                const b = [...(best.get(p.id)?.values() ?? [])];
                const avg = b.length ? Math.round(b.reduce((x, y) => x + y, 0) / b.length) : null;
                return (
                  <tr key={p.id}>
                    <td><Link href={`/admin/colaboradores/${p.id}`} className="font-semibold text-navy-950 hover:underline">{p.full_name || p.email}</Link><p className="text-xs text-slate-500">{p.department}</p></td>
                    <td className="text-sm">{(p.job_role_id && roleName.get(p.job_role_id)) || "—"}</td>
                    <td className="w-44"><div className="flex items-center gap-2"><ProgressBar pct={pct} className="flex-1" /><span className="text-xs font-semibold tabular-nums">{s?.requiredDone ?? 0}/{s?.required ?? 0}</span></div></td>
                    <td className="tabular-nums">{rows.filter((r) => r.user_id === p.id && rowDone(r)).length}</td>
                    <td className="tabular-nums">{s?.certificates ?? 0}</td>
                    <td className="tabular-nums">{avg === null ? "—" : `${avg}%`}</td>
                    <td>{(s?.overdue ?? 0) > 0 ? <span className="font-bold text-red-600">{s!.overdue}</span> : "0"}</td>
                    <td className="text-sm text-slate-500 whitespace-nowrap">{s?.last ? timeAgo(s.last) : "—"}</td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={8} className="py-8 text-center text-slate-500">Ninguém encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="h-row">Conclusão por curso obrigatório</h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {[...byCourse.values()].sort((a, b) => a.done / a.req - b.done / b.req).map((c) => {
            const pct = Math.round((c.done / c.req) * 100);
            return (
              <li key={c.title} className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-2 flex justify-between gap-3 text-sm"><span className="font-semibold text-navy-950">{c.title}</span><span className="tabular-nums text-slate-500">{c.done}/{c.req}</span></div>
                <ProgressBar pct={pct} />
              </li>
            );
          })}
          {!byCourse.size && <li className="text-slate-500">Nenhum curso obrigatório (trilha ou atribuição) ainda.</li>}
        </ul>
      </section>
    </div>
  );
}
