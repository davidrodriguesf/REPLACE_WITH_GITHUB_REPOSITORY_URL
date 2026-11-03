import { requireAdmin } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime, siteUrl } from "@/lib/utils";

export default async function AdminWebhooks() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("webhook_events").select("*").order("created_at", { ascending: false }).limit(100);
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h1 className="h-section">Integração com a Appmax</h1>
        <p className="text-sm text-muted mt-1">Na Appmax, cadastre o webhook com esta URL (troque o token pelo valor de <code>APPMAX_WEBHOOK_SECRET</code>):</p>
        <code className="block mt-2 rounded-lg bg-black text-emerald-700 px-3 py-2 text-xs break-all">{siteUrl("/api/webhooks/appmax")}?token=SEU_TOKEN</code>
        <p className="text-sm text-muted mt-2">Em cada curso pago, informe o ID ou SKU do produto na Appmax. Pagamento aprovado libera o curso; reembolso/chargeback remove o acesso.</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Quando</th><th>Evento</th><th>Cliente</th><th>Pedido</th><th>Status</th><th>Detalhe</th></tr></thead>
          <tbody>
            {(data ?? []).map((h) => (
              <tr key={h.id}>
                <td className="whitespace-nowrap text-xs">{formatDateTime(h.created_at)}</td>
                <td>{h.event ?? "—"}</td>
                <td className="text-xs">{h.email ?? "—"}</td>
                <td className="text-xs">{h.order_id ?? "—"}</td>
                <td><StatusBadge status={h.status} /></td>
                <td className="text-xs text-muted max-w-xs">
                  {h.error}
                  <details className="mt-1">
                    <summary className="cursor-pointer">payload</summary>
                    <pre className="text-[10px] whitespace-pre-wrap break-all max-h-60 overflow-auto bg-slate-50 p-2 rounded">{JSON.stringify(h.payload, null, 2)}</pre>
                  </details>
                </td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={6} className="text-center text-muted py-6">Nenhum webhook recebido ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
