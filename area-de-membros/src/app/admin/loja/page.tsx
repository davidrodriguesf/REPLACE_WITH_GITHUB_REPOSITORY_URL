import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Cover } from "@/components/Cards";
import { SubmitButton } from "@/components/ui";
import { buyCourse, refreshOrders } from "../marketplace-actions";
import { formatDate } from "@/lib/utils";

type Item = { id: string; slug: string; title: string; subtitle: string | null; description: string | null; cover_url: string | null;
  workload_hours: number | null; price: number | null; is_published: boolean; lessons: number; modules: number; licensed: boolean; pending_invoice: string | null };

const brl = (v: number | null) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const STATUS: Record<string, string> = { pending: "Aguardando pagamento", paid: "Pago", cancelled: "Cancelado", refunded: "Estornado" };

export default async function Loja({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { supabase, profile } = await requireAdmin();
  const sp = await searchParams;
  const [{ data }, { data: orders }] = await Promise.all([
    supabase.rpc("marketplace_catalog"),
    supabase.from("orders").select("id, course_id, amount, status, invoice_url, created_at, paid_at").eq("company_id", profile.company_id).order("created_at", { ascending: false }).limit(20),
  ]);
  const items = ((data ?? []) as Item[]).filter((i) => i.is_published);
  const titles = new Map(items.map((i) => [i.id, i.title]));
  const hasPending = (orders ?? []).some((o) => o.status === "pending");
  return (
    <div className="space-y-8">
      <div>
        <h1 className="h-row">Marketplace PestX</h1>
        <p className="text-slate-500">Cursos prontos para a sua equipe. Pague por Pix, boleto ou cartão: o curso é liberado assim que o pagamento é confirmado.</p>
      </div>
      {sp.erro && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{sp.erro}</p>}
      {sp.ok && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{sp.ok}</p>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((i) => (
          <article key={i.id} className="card flex flex-col overflow-hidden">
            <Cover title={i.title} url={i.cover_url} rounded="rounded-none" />
            <div className="flex flex-1 flex-col gap-2 p-4">
              <h2 className="font-bold text-navy-950">{i.title}</h2>
              {i.subtitle && <p className="text-sm text-slate-600">{i.subtitle}</p>}
              <p className="text-xs text-slate-500">{i.modules} módulo(s) · {i.lessons} aulas{i.workload_hours ? ` · ${i.workload_hours}h` : ""} · certificado com a marca da sua empresa</p>
              {i.description && <p className="line-clamp-3 text-sm text-slate-600">{i.description}</p>}
              <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                <span className="text-lg font-bold text-navy-950">{brl(i.price)}</span>
                {i.licensed ? (
                  <Link href={`/cursos/${i.slug}`} className="btn btn-secondary btn-sm">Já é da empresa ✓</Link>
                ) : i.pending_invoice ? (
                  <a href={i.pending_invoice} className="btn btn-light btn-sm" target="_blank" rel="noreferrer">Pagar cobrança aberta</a>
                ) : (
                  <form action={buyCourse}>
                    <input type="hidden" name="course_id" value={i.id} />
                    <SubmitButton className="btn-sm" pendingText="Gerando cobrança...">Comprar para a equipe</SubmitButton>
                  </form>
                )}
              </div>
            </div>
          </article>
        ))}
        {!items.length && <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500 sm:col-span-2 xl:col-span-3">Ainda não há cursos no marketplace.</p>}
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="h-section">Pedidos da empresa</h2>
          {hasPending && (
            <form action={refreshOrders}><SubmitButton variant="secondary" className="btn-sm" pendingText="Conferindo...">Já paguei: conferir pagamento</SubmitButton></form>
          )}
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="table min-w-[560px]">
            <thead><tr><th>Curso</th><th>Valor</th><th>Pedido em</th><th>Situação</th></tr></thead>
            <tbody>
              {(orders ?? []).map((o) => (
                <tr key={o.id as string}>
                  <td>{titles.get(o.course_id as string) ?? "Curso"}</td>
                  <td>{brl(o.amount as number)}</td>
                  <td>{formatDate(o.created_at as string)}</td>
                  <td>
                    {STATUS[o.status as string] ?? o.status}
                    {o.status === "pending" && o.invoice_url ? <> · <a className="link" href={o.invoice_url as string} target="_blank" rel="noreferrer">pagar</a></> : null}
                  </td>
                </tr>
              ))}
              {!(orders ?? []).length && <tr><td colSpan={4} className="py-6 text-center text-slate-500">Nenhum pedido ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
