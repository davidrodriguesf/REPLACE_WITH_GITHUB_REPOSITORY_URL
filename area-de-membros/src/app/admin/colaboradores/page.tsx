import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getReport, summarize } from "@/lib/reports";
import { Avatar } from "@/components/Avatar";
import { ProgressBar } from "@/components/Cards";
import { timeAgo } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { InviteForm } from "./EmployeeForms";

export default async function Colaboradores({ searchParams }: { searchParams: Promise<{ q?: string; funcao?: string; status?: string }> }) {
  const { q = "", funcao = "", status = "ativos" } = await searchParams;
  const { supabase } = await requireAdmin();
  let query = supabase.from("profiles").select("*").order("full_name").limit(300);
  const term = q.replace(/[%,()]/g, "").trim();
  if (term) query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%,department.ilike.%${term}%`);
  if (funcao) query = query.eq("job_role_id", funcao);
  if (status !== "todos") query = query.eq("is_active", status === "ativos");
  const [{ data }, { data: roles }, { data: managers }, rows] = await Promise.all([
    query,
    supabase.from("job_roles").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name").in("role", ["manager", "admin"]).eq("is_active", true).order("full_name"),
    getReport(supabase),
  ]);
  const people = (data ?? []) as Profile[];
  const roleName = new Map((roles ?? []).map((r) => [r.id as string, r.name as string]));
  const mgrName = new Map((managers ?? []).map((m) => [m.id as string, m.full_name as string]));
  const sum = summarize(rows);
  const roleOpts = (roles ?? []).map((r) => ({ id: r.id as string, name: r.name as string }));
  const mgrOpts = (managers ?? []).map((m) => ({ id: m.id as string, name: (m.full_name as string) ?? "" }));

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="min-w-0 space-y-4">
        <h1 className="h-row">Colaboradores</h1>
        <form className="grid gap-2 sm:grid-cols-[1fr_200px_150px_auto]">
          <input className="input" name="q" defaultValue={q} placeholder="Buscar nome, e-mail ou departamento" />
          <select className="input" name="funcao" defaultValue={funcao}>
            <option value="">Todas as funções</option>
            {roleOpts.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select className="input" name="status" defaultValue={status}>
            <option value="ativos">Ativos</option>
            <option value="inativos">Inativos</option>
            <option value="todos">Todos</option>
          </select>
          <button className="btn btn-secondary">Filtrar</button>
        </form>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="table min-w-[720px]">
            <thead><tr><th>Colaborador</th><th>Função / gestor</th><th>Trilha e obrigatórios</th><th>Última atividade</th></tr></thead>
            <tbody>
              {people.map((p) => {
                const s = sum.get(p.id);
                const pct = s?.required ? Math.round((s.requiredDone / s.required) * 100) : 0;
                return (
                  <tr key={p.id} className={p.is_active ? "" : "opacity-50"}>
                    <td>
                      <Link href={`/admin/colaboradores/${p.id}`} className="flex items-center gap-3">
                        <Avatar name={p.full_name} url={p.avatar_url} size={36} />
                        <span className="min-w-0">
                          <span className="block font-semibold text-navy-950 hover:underline">{p.full_name || p.email}</span>
                          <span className="block text-xs text-slate-500">{p.email}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="text-sm">
                      {(p.job_role_id && roleName.get(p.job_role_id)) || <span className="text-slate-400">Sem função</span>}
                      {p.role !== "employee" && <span className="badge ml-2 !px-2 !py-0.5 !text-xs bg-brand-50 text-navy-800">{p.role === "admin" ? "Admin" : "Gestor"}</span>}
                      <p className="text-xs text-slate-500">{p.manager_id ? `Gestor: ${mgrName.get(p.manager_id) ?? "—"}` : p.department ?? ""}</p>
                    </td>
                    <td className="w-52">
                      <div className="flex items-center gap-2"><ProgressBar pct={pct} className="flex-1" /><span className="text-xs font-semibold tabular-nums">{pct}%</span></div>
                      {(s?.overdue ?? 0) > 0 && <p className="mt-1 text-xs font-bold text-red-600">{s!.overdue} atrasado(s)</p>}
                    </td>
                    <td className="text-sm text-slate-500 whitespace-nowrap">{s?.last ? timeAgo(s.last) : "—"}</td>
                  </tr>
                );
              })}
              {!people.length && <tr><td colSpan={4} className="py-8 text-center text-slate-500">Ninguém encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section><InviteForm roles={roleOpts} managers={mgrOpts} /></section>
    </div>
  );
}
