import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { Db } from "@/lib/db/client";
import { CourseForm } from "../cursos/CourseForm";
import { grantLicense, revokeLicense } from "../marketplace-actions";
import { ConfirmButton, SubmitButton } from "@/components/ui";
import { formatDate } from "@/lib/utils";

const brl = (v: number | null) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Área do super admin do PestX: cursos oferecidos a todas as empresas, vendas e liberações
export default async function MarketplaceAdmin() {
  const { supabase, profile } = await requireSuperAdmin();
  const db = new Db("service", null);
  const [{ data: courses }, companies, licenses, orders, { data: cats }, { data: inst }] = await Promise.all([
    supabase.rpc("marketplace_catalog"),
    db.sql<{ id: string; name: string }>("select id, coalesce(custom_name, pestx->>'name', name) as name from public.companies where not is_platform order by 2"),
    db.sql<{ company_id: string; course_id: string; company: string; course: string; order_id: string | null; created_at: string }>(
      `select l.company_id, l.course_id, coalesce(co.custom_name, co.pestx->>'name', co.name) company, c.title course, l.order_id, l.created_at
       from public.course_licenses l join public.companies co on co.id = l.company_id join public.courses c on c.id = l.course_id
       order by l.created_at desc limit 200`),
    db.sql<{ id: string; company: string; course: string; amount: number; status: string; created_at: string }>(
      `select o.id, coalesce(co.custom_name, co.pestx->>'name', co.name) company, c.title course, o.amount, o.status, o.created_at
       from public.orders o join public.companies co on co.id = o.company_id join public.courses c on c.id = o.course_id
       order by o.created_at desc limit 100`),
    supabase.from("categories").select("id, name").eq("company_id", profile.company_id).order("position"),
    supabase.from("instructors").select("id, name").eq("company_id", profile.company_id).order("name"),
  ]);
  const list = (courses ?? []) as { id: string; title: string; price: number | null; is_published: boolean; lessons: number }[];
  const sold = orders.filter((o) => o.status === "paid").reduce((s, o) => s + Number(o.amount), 0);
  return (
    <div className="space-y-10">
      <div>
        <h1 className="h-row">Super admin PestX · Marketplace</h1>
        <p className="text-slate-500">Cursos que o PestX oferece para as empresas clientes. Cada empresa compra para a equipe e o certificado sai com a marca dela.</p>
        <p className="mt-2 text-sm font-semibold text-navy-950">Vendido (pago): {brl(sold)} · {companies.length} empresa(s) na Academia</p>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_460px]">
        <section className="min-w-0 space-y-3">
          <h2 className="h-section">Cursos do marketplace</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="table min-w-[560px]">
              <thead><tr><th>Curso</th><th>Preço</th><th>Aulas</th><th>Situação</th><th></th></tr></thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id}>
                    <td className="font-semibold text-navy-950">{c.title}</td>
                    <td>{brl(c.price)}</td>
                    <td>{c.lessons}</td>
                    <td>{c.is_published ? <span className="font-semibold text-emerald-700">À venda</span> : <span className="text-slate-400">Rascunho</span>}</td>
                    <td><Link href={`/admin/cursos/${c.id}`} className="btn btn-secondary btn-sm">Editar</Link></td>
                  </tr>
                ))}
                {!list.length && <tr><td colSpan={5} className="py-6 text-center text-slate-500">Nenhum curso no marketplace ainda.</td></tr>}
              </tbody>
            </table>
          </div>

          <h2 className="h-section pt-6">Liberar curso sem cobrança</h2>
          <form action={grantLicense} className="flex flex-wrap gap-2 rounded-2xl border border-dashed border-slate-300 p-4">
            <select name="company_id" className="input !w-auto flex-1" required defaultValue="">
              <option value="" disabled>Empresa</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select name="course_id" className="input !w-auto flex-1" required defaultValue="">
              <option value="" disabled>Curso</option>
              {list.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <SubmitButton pendingText="...">Liberar</SubmitButton>
          </form>

          <h2 className="h-section pt-6">Empresas com cursos</h2>
          <ul className="space-y-2">
            {licenses.map((l) => (
              <li key={l.company_id + l.course_id} className="card flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span><strong>{l.company}</strong> · {l.course} <span className="text-slate-500">· {l.order_id ? "comprado" : "cortesia"} em {formatDate(l.created_at)}</span></span>
                <form action={revokeLicense}>
                  <input type="hidden" name="company_id" value={l.company_id} />
                  <input type="hidden" name="course_id" value={l.course_id} />
                  <ConfirmButton variant="ghost" className="btn-sm" message={`Retirar "${l.course}" de ${l.company}?`}>Retirar</ConfirmButton>
                </form>
              </li>
            ))}
            {!licenses.length && <li className="text-sm text-slate-500">Nenhuma ainda.</li>}
          </ul>

          <h2 className="h-section pt-6">Últimas vendas</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="table min-w-[560px]">
              <thead><tr><th>Empresa</th><th>Curso</th><th>Valor</th><th>Data</th><th>Situação</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}><td>{o.company}</td><td>{o.course}</td><td>{brl(o.amount)}</td><td>{formatDate(o.created_at)}</td><td>{({ pending: "Aguardando", paid: "Pago", cancelled: "Cancelado", refunded: "Estornado" } as Record<string, string>)[o.status]}</td></tr>
                ))}
                {!orders.length && <tr><td colSpan={5} className="py-6 text-center text-slate-500">Nenhuma venda ainda.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="h-section mb-3">Novo curso do marketplace</h2>
          <CourseForm marketplace categories={(cats ?? []) as { id: string; name: string }[]} roles={[]} instructors={(inst ?? []) as { id: string; name: string }[]} />
        </section>
      </div>
    </div>
  );
}
