import { requireAdmin } from "@/lib/auth";
import { deleteJobRole, saveJobRole } from "../actions";
import { ConfirmButton, SubmitButton } from "@/components/ui";

export default async function Funcoes() {
  const { supabase } = await requireAdmin();
  const [{ data: roles }, { data: people }, { data: trails }] = await Promise.all([
    supabase.from("job_roles").select("*").order("name"),
    supabase.from("profiles").select("job_role_id").eq("is_active", true),
    supabase.from("trail_job_roles").select("job_role_id, trails(title)"),
  ]);
  const count = new Map<string, number>();
  for (const p of people ?? []) if (p.job_role_id) count.set(p.job_role_id, (count.get(p.job_role_id) ?? 0) + 1);
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="h-row">Funções</h1>
        <p className="text-slate-500">Cada colaborador tem uma função. A função define qual trilha de estudo ele recebe.</p>
      </div>
      {(roles ?? []).map((r) => {
        const t = (trails ?? []).filter((x) => x.job_role_id === r.id).map((x) => (x.trails as unknown as { title: string } | null)?.title).filter(Boolean);
        return (
          <div key={r.id} className="card p-4 space-y-3">
            <form action={saveJobRole} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
              <input type="hidden" name="id" value={r.id} />
              <input className="input" name="name" defaultValue={r.name} required aria-label="Nome" />
              <input className="input" name="description" defaultValue={r.description ?? ""} placeholder="Descrição" aria-label="Descrição" />
              <SubmitButton variant="secondary" pendingText="...">Salvar</SubmitButton>
            </form>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
              <span>{count.get(r.id) ?? 0} colaborador(es) · Trilha: {t.length ? t.join(", ") : <span className="text-amber-700">nenhuma</span>}</span>
              <form action={deleteJobRole}>
                <input type="hidden" name="id" value={r.id} />
                <ConfirmButton message={`Excluir a função "${r.name}"? Os colaboradores ficarão sem função.`} variant="ghost" className="btn-sm">Excluir</ConfirmButton>
              </form>
            </div>
          </div>
        );
      })}
      <form action={saveJobRole} className="card border-dashed p-4 grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
        <input className="input" name="name" placeholder="Nova função (ex.: Vendedor)" required />
        <input className="input" name="description" placeholder="Descrição (opcional)" />
        <SubmitButton pendingText="...">Adicionar</SubmitButton>
      </form>
    </div>
  );
}
