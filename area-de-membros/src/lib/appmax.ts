/**
 * Interpretação tolerante do payload de webhook da Appmax.
 * A Appmax envia algo como:
 * { "event": "OrderPaid", "data": { "id": 123, "customer": { "firstname", "lastname", "email" },
 *   "bundles": [ { "id", "sku", "name", "products": [ { "id", "sku", "name" } ] } ] } }
 * Como o formato pode variar entre versões, procuramos os campos em vários lugares.
 */
type Json = Record<string, unknown>;

const DEFAULT_GRANT = ["OrderApproved", "OrderPaid", "OrderPaidByPix", "OrderPaidByBillet", "OrderIntegrated"];
const DEFAULT_REVOKE = ["OrderRefund", "OrderChargeBack", "OrderChargeback", "OrderRefunded"];

const list = (env: string | undefined, fallback: string[]) =>
  (env ? env.split(",") : fallback).map((s) => s.trim().toLowerCase()).filter(Boolean);

export function classifyEvent(event: string | null): "grant" | "revoke" | "ignore" {
  if (!event) return "ignore";
  const e = event.toLowerCase();
  if (list(process.env.APPMAX_GRANT_EVENTS, DEFAULT_GRANT).includes(e)) return "grant";
  if (list(process.env.APPMAX_REVOKE_EVENTS, DEFAULT_REVOKE).includes(e)) return "revoke";
  return "ignore";
}

const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const s = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v).trim() : "");

export function parseAppmaxPayload(body: unknown) {
  const root = isObj(body) ? body : {};
  const data = isObj(root.data) ? root.data : root;
  const event = s(root.event) || s(root.type) || s(data.event) || null;

  const customer = (isObj(data.customer) ? data.customer : isObj(root.customer) ? root.customer : {}) as Json;
  const email = (s(customer.email) || s(data.email) || s(data.customer_email)).toLowerCase() || null;
  const name =
    [s(customer.firstname), s(customer.lastname)].filter(Boolean).join(" ") ||
    s(customer.name) ||
    s(customer.fullname) ||
    s(data.customer_name) ||
    null;

  const orderId = s(data.order_id) || s(data.id) || s(root.order_id) || null;

  // Coleta IDs e SKUs de produtos / bundles em qualquer nível
  const productIds = new Set<string>();
  const addItem = (item: unknown) => {
    if (!isObj(item)) return;
    for (const k of ["id", "sku", "product_id", "external_id"]) {
      const v = s(item[k]);
      if (v) productIds.add(v);
    }
  };
  const walk = (node: unknown, depth = 0) => {
    if (depth > 4 || !isObj(node)) return;
    for (const [k, v] of Object.entries(node)) {
      if (["products", "bundles", "items"].includes(k) && Array.isArray(v)) {
        v.forEach((item) => {
          addItem(item);
          walk(item, depth + 1);
        });
      } else if (k === "product" && isObj(v)) {
        addItem(v);
      }
    }
  };
  walk(data);

  return { event, email, name, orderId, productIds: [...productIds] };
}
