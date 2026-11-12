import { requireAdmin } from "@/lib/auth";
import { deleteLibraryItem, saveLibraryItem } from "../actions";
import { ConfirmButton, SubmitButton } from "@/components/ui";
import type { LibraryItem } from "@/lib/types";
import { FileField } from "@/components/FileField";

function Fields({ i }: { i?: LibraryItem }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <input className="input sm:col-span-2" name="title" defaultValue={i?.title} placeholder="Título *" required />
      <input className="input" name="author" defaultValue={i?.author ?? ""} placeholder="Autor" />
      <input className="input" name="category" defaultValue={i?.category ?? ""} placeholder="Categoria (ex.: Manuais, Livros)" />
      <input className="input" name="position" type="number" defaultValue={i?.position ?? 0} aria-label="Ordem" />
      <div className="sm:col-span-2"><FileField name="file" kind="doc" label="Arquivo (PDF, Word, Excel ou PowerPoint)" current={i?.file_url} /></div>
      <div className="sm:col-span-2"><FileField name="cover" label="Capa (retrato 2:3, opcional)" current={i?.cover_url} aspect="aspect-[2/3]" /></div>
    </div>
  );
}

export default async function BibliotecaAdmin({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { supabase } = await requireAdmin();
  const { erro } = await searchParams;
  const { data } = await supabase.from("library_items").select("*").order("position").order("created_at", { ascending: false });
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="h-row">Biblioteca</h1>
        <p className="text-slate-500">E-books, manuais, políticas e materiais de apoio.</p>
      </div>
      {erro && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{erro}</p>}
      {((data ?? []) as LibraryItem[]).map((i) => (
        <details key={i.id} className="card p-4">
          <summary className="cursor-pointer list-none font-semibold text-navy-950">{i.title} <span className="font-normal text-slate-500">{i.author ? `· ${i.author}` : ""}{i.category ? ` · ${i.category}` : ""}</span></summary>
          <form action={saveLibraryItem} className="mt-4 space-y-2">
            <input type="hidden" name="id" value={i.id} />
            <Fields i={i} />
            <SubmitButton variant="secondary">Salvar</SubmitButton>
          </form>
          <form action={deleteLibraryItem} className="mt-2">
            <input type="hidden" name="id" value={i.id} />
            <ConfirmButton message="Excluir este item?" variant="ghost" className="btn-sm">Excluir</ConfirmButton>
          </form>
        </details>
      ))}
      <form action={saveLibraryItem} className="space-y-2 rounded-2xl border border-dashed border-slate-300 p-4">
        <p className="font-bold text-navy-950">Novo material</p>
        <Fields />
        <SubmitButton pendingText="...">Adicionar</SubmitButton>
      </form>
    </div>
  );
}
