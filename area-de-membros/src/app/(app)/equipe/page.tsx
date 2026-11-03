import Link from "next/link";
import { requireManager } from "@/lib/auth";
import { getReport, summarize } from "@/lib/reports";
import { Avatar } from "@/components/Avatar";
import { EmptyState, ProgressBar } from "@/components/Cards";
import { IconBriefcase } from "@/components/Icons";
import { timeAgo } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Minha equipe" };

export default async function Equipe() {
  const { supabase, user } = await requireManager();
  const [{ data: team }, { data: roles }, rows, { data: plans }] = await Promise.all([
    supabase.from("profiles").select("*").eq("manager_id", user.id).order("full_name"),
    supabase.from("job_roles").select("id, name"),
    getReport(supabase),
    supabase.from("development_plans").select("user_id, status"),
  ]);
  const members = (team ?? []) as Profile[];
  const roleName = new Map((roles ?? []).map((r) => [r.id as string, r.name as string]));
  const sum = summarize(rows);
  const activePlans = new Map<string, number>();
  for (const p of plans ?? []) if (p.status === "active") activePlans.set(p.user_id, (activePlans.get(p.user_id) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-page">Minha equipe</h1>
        <p className="mt-2 text-slate-500">Acompanhe trilhas, avaliações e planos de desenvolvimento do seu time.</p>
      </div>
      {members.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {members.map((m) => {
            const s = sum.get(m.id);
            const pct = s?.required ? Math.round((s.requiredDone / s.required) * 100) : 0;
            return (
              <Link key={m.id} href={`/equipe/${m.id}`} className="rounded-2xl border border-slate-200 p-5 transition hover:shadow-md">
                <div className="flex items-center gap-4">
                  <Avatar name={m.full_name} url={m.avatar_url} size={52} square />
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold text-navy-950 truncate">{m.full_name}</p>
                    <p className="text-sm text-slate-500 truncate">{(m.job_role_id && roleName.get(m.job_role_id)) || "Sem função"}{m.department ? ` · ${m.department}` : ""}</p>
                  </div>
                  {(s?.overdue ?? 0) > 0 && <span className="badge bg-red-50 text-red-700">{s!.overdue} atrasado{s!.overdue > 1 ? "s" : ""}</span>}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <ProgressBar pct={pct} className="flex-1" />
                  <span className="text-sm font-semibold tabular-nums text-slate-600">{pct}%</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {s?.requiredDone ?? 0}/{s?.required ?? 0} obrigatórios · {s?.certificates ?? 0} certificados · {activePlans.get(m.id) ?? 0} PDI ativo
                  {s?.last ? ` · ativo ${timeAgo(s.last)}` : ""}
                </p>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<IconBriefcase className="w-14 h-14" />} title="Ninguém na sua equipe ainda" text="O RH define quem é o gestor de cada colaborador no painel administrativo." />
      )}
    </div>
  );
}
