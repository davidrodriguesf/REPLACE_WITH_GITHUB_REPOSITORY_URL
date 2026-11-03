import { requireAdmin } from "@/lib/auth";
import { deleteSpace, saveSpace } from "../actions";
import { ConfirmButton, SubmitButton } from "@/components/ui";
import type { Space } from "@/lib/types";

function SpaceFields({ s }: { s?: Space }) {
  return (
    <>
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid gap-2 sm:grid-cols-[80px_1fr_1fr]">
        <input className="input" name="position" type="number" defaultValue={s?.position ?? 0} aria-label="Ordem" />
        <input className="input" name="name" defaultValue={s?.name} placeholder="Nome do espaço" required />
        <input className="input" name="slug" defaultValue={s?.slug} placeholder="slug (opcional)" />
      </div>
      <input className="input" name="description" defaultValue={s?.description ?? ""} placeholder="Descrição" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="admin_only_posts" defaultChecked={s?.admin_only_posts} /> Somente a equipe pode publicar (alunos podem comentar)
      </label>
    </>
  );
}

export default async function AdminCommunity() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("spaces").select("*").order("position");
  const spaces = (data ?? []) as Space[];
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="h-section">Espaços da comunidade</h1>
        <p className="text-sm text-muted">Organize as conversas em canais. Moderação (fixar/excluir posts e comentários) é feita direto na comunidade.</p>
      </div>
      {spaces.map((s) => (
        <div key={s.id} className="card p-4 space-y-3">
          <form action={saveSpace} className="space-y-3">
            <SpaceFields s={s} />
            <SubmitButton variant="secondary" pendingText="...">Salvar</SubmitButton>
          </form>
          <form action={deleteSpace}>
            <input type="hidden" name="id" value={s.id} />
            <ConfirmButton message={`Excluir o espaço "${s.name}" e todos os posts dele?`} className="btn-sm">Excluir espaço</ConfirmButton>
          </form>
        </div>
      ))}
      <form action={saveSpace} className="card p-4 space-y-3 border-dashed">
        <p className="font-semibold">Novo espaço</p>
        <SpaceFields />
        <SubmitButton>Criar espaço</SubmitButton>
      </form>
    </div>
  );
}
