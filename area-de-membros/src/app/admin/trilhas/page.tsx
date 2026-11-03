import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import type { Trail } from "@/lib/types";
import { TrailForm } from "./TrailForm";

export default async function TrilhasAdmin() {
  const { supabase } = await requireAdmin();
  const [{ data: trails }, { data: roles }, { data: tr }, { data: tc }] = await Promise.all([
    supabase.from("trails").select("*").order("position"),
    supabase.from("job_roles").select("id, name").order("name"),
    supabase.from("trail_job_roles").select("trail_id, job_roles(name)"),
    supabase.from("trail_courses").select("trail_id"),
  ]);
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="space-y-3">
        <h1 className="h-row">Trilhas</h1>
        {((trails ?? []) as Trail[]).map((t) => (
          <Link key={t.id} href={`/admin/trilhas/${t.id}`} className="block rounded-2xl border border-slate-200 p-5 hover:shadow-md">
            <p className="text-lg font-bold text-navy-950">{t.title}</p>
            <p className="text-sm text-slate-500">
              {(tc ?? []).filter((x) => x.trail_id === t.id).length} cursos · Funções: {(tr ?? []).filter((x) => x.trail_id === t.id).map((x) => (x.job_roles as unknown as { name: string } | null)?.name).join(", ") || "nenhuma"}
            </p>
          </Link>
        ))}
        {!trails?.length && <p className="card p-6 text-slate-500">Nenhuma trilha ainda. Crie a primeira ao lado.</p>}
      </section>
      <section>
        <h2 className="h-section mb-3">Nova trilha</h2>
        <TrailForm roles={(roles ?? []) as { id: string; name: string }[]} />
      </section>
    </div>
  );
}
