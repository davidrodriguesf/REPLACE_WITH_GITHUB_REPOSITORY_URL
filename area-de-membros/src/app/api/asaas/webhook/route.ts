import { timingSafeEqual } from "node:crypto";
import { applyPaymentStatus } from "@/lib/asaas";

// Webhook do Asaas (Configurações > Integrações > Webhooks): URL https://SEU-SITE/api/asaas/webhook
// e o "Token de autenticação" igual ao ASAAS_WEBHOOK_TOKEN da VPS.
function tokenOk(got: string | null) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN || "";
  if (expected.length < 16 || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!tokenOk(req.headers.get("asaas-access-token"))) return new Response("token inválido", { status: 401 });
  let body: { event?: string; payment?: { id?: string; status?: string } };
  try { body = await req.json(); } catch { return new Response("json inválido", { status: 400 }); }
  const p = body.payment;
  if (p?.id && p.status) {
    try {
      await applyPaymentStatus(p.id, p.status, body.event === "PAYMENT_DELETED");
    } catch (e) {
      console.error("[asaas] webhook:", e);
      return new Response("erro", { status: 500 }); // o Asaas tenta de novo
    }
  }
  return Response.json({ received: true });
}
