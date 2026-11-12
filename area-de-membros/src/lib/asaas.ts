import "server-only";
import { Db } from "@/lib/db/client";

/*
 * Asaas (Pix, boleto e cartão) para as compras do marketplace.
 * ASAAS_API_KEY      chave da conta Asaas do PestX (fica só na VPS)
 * ASAAS_ENV          "production" (padrão) ou "sandbox" para testes
 * ASAAS_WEBHOOK_TOKEN token que o Asaas manda no cabeçalho asaas-access-token do webhook
 */
const service = () => new Db("service", null);
export const asaasEnabled = () => !!process.env.ASAAS_API_KEY;
const base = () =>
  process.env.ASAAS_BASE_URL || (process.env.ASAAS_ENV === "sandbox" ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3");

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(base() + path, {
    method,
    headers: { access_token: process.env.ASAAS_API_KEY || "", "Content-Type": "application/json", "User-Agent": "academia-pestx" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 300);
    try { msg = (JSON.parse(text).errors as { description: string }[]).map((e) => e.description).join(" ") || msg; } catch { /* texto puro */ }
    throw new Error(`Asaas: ${msg}`);
  }
  return JSON.parse(text) as T;
}

export async function createCustomer(c: { name: string; cnpj: string; email: string | null; companyId: string }) {
  const r = await call<{ id: string }>("POST", "/customers", {
    name: c.name, cpfCnpj: c.cnpj.replace(/\D/g, ""), email: c.email || undefined, externalReference: c.companyId,
    notificationDisabled: false,
  });
  return r.id;
}

export async function createPayment(p: { customer: string; value: number; description: string; orderId: string }) {
  const due = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  return call<{ id: string; invoiceUrl: string; status: string }>("POST", "/payments", {
    customer: p.customer, billingType: "UNDEFINED", value: p.value, dueDate: due,
    description: p.description.slice(0, 500), externalReference: p.orderId,
  });
}

export async function getPayment(id: string) {
  return call<{ id: string; status: string; externalReference: string | null }>("GET", `/payments/${encodeURIComponent(id)}`);
}

const PAID = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);
const REFUNDED = new Set(["REFUNDED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "AWAITING_CHARGEBACK_REVERSAL"]);

/** Aplica o status do Asaas no pedido: pago → libera o curso para a empresa; estornado → retira. */
export async function applyPaymentStatus(paymentId: string, status: string, deleted = false) {
  const db = service();
  const order = (await db.sql<{ id: string; company_id: string; course_id: string; status: string }>(
    "select id, company_id, course_id, status from public.orders where asaas_payment_id = $1", [paymentId]))[0];
  if (!order) return null;
  if (PAID.has(status) && order.status !== "paid") {
    await db.sql("update public.orders set status = 'paid', paid_at = now() where id = $1", [order.id]);
    await db.sql(
      "insert into public.course_licenses (company_id, course_id, order_id) values ($1, $2, $3) on conflict (company_id, course_id) do nothing",
      [order.company_id, order.course_id, order.id],
    );
    return "paid";
  }
  if (REFUNDED.has(status) && order.status !== "refunded") {
    await db.sql("update public.orders set status = 'refunded' where id = $1", [order.id]);
    await db.sql("delete from public.course_licenses where company_id = $1 and course_id = $2 and order_id = $3", [order.company_id, order.course_id, order.id]);
    return "refunded";
  }
  if (deleted && order.status === "pending") {
    await db.sql("update public.orders set status = 'cancelled' where id = $1", [order.id]);
    return "cancelled";
  }
  return order.status;
}
