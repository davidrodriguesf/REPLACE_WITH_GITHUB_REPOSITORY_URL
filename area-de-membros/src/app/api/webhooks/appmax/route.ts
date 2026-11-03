import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifyEvent, parseAppmaxPayload } from "@/lib/appmax";
import { grantCourseAccess, revokeCourseAccess } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validToken(req: NextRequest) {
  const expected = process.env.APPMAX_WEBHOOK_SECRET;
  if (!expected) return false;
  const got = req.nextUrl.searchParams.get("token") || req.headers.get("x-webhook-token") || "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Webhook Appmax ativo. Use POST." });
}

export async function POST(req: NextRequest) {
  if (!validToken(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  const raw = await req.text();
  try {
    body = JSON.parse(raw);
  } catch {
    body = Object.fromEntries(new URLSearchParams(raw));
  }

  const admin = createAdminClient();
  const parsed = parseAppmaxPayload(body);
  const action = classifyEvent(parsed.event);

  const { data: log } = await admin
    .from("webhook_events")
    .insert({ event: parsed.event, order_id: parsed.orderId, email: parsed.email, payload: body, status: "received" })
    .select("id")
    .single();
  const finish = (status: string, error?: string) =>
    log ? admin.from("webhook_events").update({ status, error: error ?? null }).eq("id", log.id) : Promise.resolve();

  try {
    if (action === "ignore") {
      await finish("ignored", `Evento "${parsed.event}" não altera acessos`);
      return NextResponse.json({ ok: true, ignored: true });
    }
    if (!parsed.email) {
      await finish("error", "E-mail do cliente não encontrado no payload");
      return NextResponse.json({ ok: false, error: "missing email" }, { status: 200 });
    }

    // Idempotência: mesmo pedido + mesmo evento já processado
    if (parsed.orderId) {
      const { data: dup } = await admin
        .from("webhook_events")
        .select("id")
        .eq("order_id", parsed.orderId)
        .eq("event", parsed.event)
        .eq("status", "processed")
        .limit(1);
      if (dup?.length) {
        await finish("ignored", "Duplicado");
        return NextResponse.json({ ok: true, duplicate: true });
      }
    }

    const { data: courses } = await admin
      .from("courses")
      .select("id")
      .overlaps("appmax_product_ids", parsed.productIds.length ? parsed.productIds : ["__none__"]);
    const courseIds = (courses ?? []).map((c) => c.id as string);

    if (!courseIds.length) {
      await finish("error", `Nenhum curso vinculado aos produtos: ${parsed.productIds.join(", ") || "(nenhum)"}`);
      return NextResponse.json({ ok: false, error: "no course matched" }, { status: 200 });
    }

    if (action === "grant") {
      const r = await grantCourseAccess({
        email: parsed.email,
        name: parsed.name,
        courseIds,
        source: "purchase",
        orderId: parsed.orderId,
      });
      await finish("processed");
      return NextResponse.json({ ok: true, ...r });
    }

    const r = await revokeCourseAccess({ email: parsed.email, courseIds, onlySource: "purchase" });
    await finish("processed");
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finish("error", msg);
    // 500 faz a Appmax tentar novamente
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
