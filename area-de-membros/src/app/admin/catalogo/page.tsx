import { requireAdmin } from "@/lib/auth";
import { deleteCategory, deleteInstructor, saveCategory, saveInstructor } from "../actions";
import { Avatar } from "@/components/Avatar";
import { FileField } from "@/components/FileField";
import { ConfirmButton, SubmitButton } from "@/components/ui";
import type { Category, Instructor } from "@/lib/types";

export default async function CatalogoAdmin({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { supabase, profile } = await requireAdmin();
  const { erro } = await searchParams;
  const [{ data: cats }, { data: inst }] = await Promise.all([
    supabase.from("categories").select("*").eq("company_id", profile.company_id).order("position"),
    supabase.from("instructors").select("*").eq("company_id", profile.company_id).order("name"),
  ]);
  return (
    <div className="grid grid-cols-1 gap-10 xl:grid-cols-2">
      {erro && <p className="xl:col-span-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{erro}</p>}
      <section className="space-y-3">
        <h1 className="h-row">Categorias</h1>
        <p className="text-slate-500">Cada categoria vira uma fileira no Início e no Catálogo.</p>
        {((cats ?? []) as Category[]).map((c) => (
          <div key={c.id} className="flex gap-2">
            <form action={saveCategory} className="flex flex-1 gap-2">
              <input type="hidden" name="id" value={c.id} />
              <input className="input !w-20" name="position" type="number" defaultValue={c.position} aria-label="Ordem" />
              <input className="input flex-1" name="name" defaultValue={c.name} aria-label="Nome" />
              <SubmitButton variant="secondary" pendingText="...">Salvar</SubmitButton>
            </form>
            <form action={deleteCategory}>
              <input type="hidden" name="id" value={c.id} />
              <ConfirmButton message={`Excluir a categoria "${c.name}"?`} variant="ghost">Excluir</ConfirmButton>
            </form>
          </div>
        ))}
        <form action={saveCategory} className="flex gap-2 rounded-2xl border border-dashed border-slate-300 p-3">
          <input className="input !w-20" name="position" type="number" defaultValue={(cats ?? []).length} aria-label="Ordem" />
          <input className="input flex-1" name="name" placeholder="Nova categoria" required />
          <SubmitButton pendingText="...">Adicionar</SubmitButton>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="h-row">Mentores e instrutores</h2>
        <p className="text-slate-500">Aparecem na página do curso, em "Mentores".</p>
        {((inst ?? []) as Instructor[]).map((i) => (
          <details key={i.id} className="card p-4">
            <summary className="flex cursor-pointer list-none items-center gap-3">
              <Avatar name={i.name} url={i.avatar_url} size={44} />
              <span><span className="block font-semibold text-navy-950">{i.name}</span><span className="text-sm text-slate-500">{i.title}</span></span>
            </summary>
            <form action={saveInstructor} className="mt-4 space-y-2">
              <input type="hidden" name="id" value={i.id} />
              <input className="input" name="name" defaultValue={i.name} required aria-label="Nome" />
              <input className="input" name="title" defaultValue={i.title ?? ""} placeholder="Cargo" />
              <FileField name="avatar" label="Foto" current={i.avatar_url} aspect="aspect-square" />
              <textarea className="input min-h-20" name="bio" defaultValue={i.bio ?? ""} placeholder="Mini bio" />
              <SubmitButton variant="secondary">Salvar</SubmitButton>
            </form>
            <form action={deleteInstructor} className="mt-2">
              <input type="hidden" name="id" value={i.id} />
              <ConfirmButton message={`Excluir ${i.name}?`} variant="ghost" className="btn-sm">Excluir</ConfirmButton>
            </form>
          </details>
        ))}
        <form action={saveInstructor} className="space-y-2 rounded-2xl border border-dashed border-slate-300 p-4">
          <p className="font-bold text-navy-950">Novo mentor</p>
          <input className="input" name="name" placeholder="Nome" required />
          <input className="input" name="title" placeholder="Cargo (ex.: Diretor Comercial)" />
          <FileField name="avatar" label="Foto" aspect="aspect-square" />
          <SubmitButton pendingText="...">Adicionar</SubmitButton>
        </form>
      </section>
    </div>
  );
}
