"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth";
import { Db } from "@/lib/db/client";
import { asaasEnabled, applyPaymentStatus, createCustomer, createPayment, getPayment } from "@/lib/asaas";
import { getCompanyRow, toBranding } from "@/lib/company";
import { str } from "@/lib/utils";

const service = () => new Db("service", null);
const back = (msg: string, ok = false): never => redirect(`/admin/loja?${ok ? "ok" : "erro"}=${encodeURIComponent(msg)}`);

/** Empresa: quem vê o curso comprado (todos ou só via trilha/atribuição). */
export async function setLicenseAudience(form: FormData) {
  const { supabase, profile } = await requireAdmin();
  await supabase
    .from("course_licenses")
    .update({ audience: str(form, "audience") === "trail" ? "trail" : "all" })
    .eq("company_id", profile.company_id)
    .eq("course_id", str(form, "course_id"));
  revalidatePath("/", "layout");
}

/** Empresa compra um curso do marketplace: gera a cobrança no Asaas e abre a página de pagamento. */
export async function buyCourse(form: FormData) {
  const { profile } = await requireAdmin();
  const courseId = str(form, "course_id");
  const companyId = profile.company_id;
  if (!companyId) back("Sua conta não está ligada a uma empresa.");
  const db = service();
  const course = (await db.sql<{ id: string; title: string; price: number | null }>(
    "select id, title, price from public.courses where id = $1 and is_marketplace and is_published", [courseId]))[0];
  if (!course || !course.price) back("Curso indisponível no momento.");
  const owned = await db.sql("select 1 from public.course_licenses where company_id = $1 and course_id = $2", [companyId, courseId]);
  if (owned.length) back("Sua empresa já tem este curso.", true);
  const pending = (await db.sql<{ invoice_url: string | null }>(
    "select invoice_url from public.orders where company_id = $1 and course_id = $2 and status = 'pending' and invoice_url is not null order by created_at desc limit 1",
    [companyId, courseId]))[0];
  if (pending?.invoice_url) redirect(pending.invoice_url);
  if (!asaasEnabled()) back("O pagamento online ainda não foi configurado pelo PestX. Tente mais tarde.");

  const row = (await getCompanyRow(companyId))!;
  const b = toBranding(row);
  if (!b.cnpj || b.cnpj.replace(/\D/g, "").length < 11) back("Para comprar, informe o CNPJ da empresa em “Empresa e certificado”.");

  let invoiceUrl: string;
  try {
    let customer = row.asaas_customer_id;
    if (!customer) {
      customer = await createCustomer({ name: b.legal_name || b.name, cnpj: b.cnpj!, email: b.email, companyId: companyId! });
      await db.sql("update public.companies set asaas_customer_id = $2 where id = $1", [companyId, customer]);
    }
    const order = (await db.sql<{ id: string }>(
      "insert into public.orders (company_id, course_id, amount, created_by) values ($1, $2, $3, $4) returning id",
      [companyId, courseId, course!.price, profile.id]))[0]!;
    const pay = await createPayment({ customer, value: course!.price!, description: `Academia PestX — curso "${course!.title}" para ${b.name}`, orderId: order.id });
    await db.sql("update public.orders set asaas_payment_id = $2, invoice_url = $3 where id = $1", [order.id, pay.id, pay.invoiceUrl]);
    invoiceUrl = pay.invoiceUrl;
  } catch (e) {
    console.error("[asaas] compra:", e);
    back(e instanceof Error ? e.message : "Não foi possível gerar a cobrança.");
  }
  redirect(invoiceUrl!);
}

/** Confere no Asaas os pedidos pendentes da empresa (caso o webhook ainda não tenha chegado). */
export async function refreshOrders() {
  const { profile } = await requireAdmin();
  const pend = await service().sql<{ asaas_payment_id: string }>(
    "select asaas_payment_id from public.orders where company_id = $1 and status = 'pending' and asaas_payment_id is not null order by created_at desc limit 10",
    [profile.company_id]);
  let paid = 0;
  for (const o of pend) {
    try {
      const p = await getPayment(o.asaas_payment_id);
      if ((await applyPaymentStatus(o.asaas_payment_id, p.status)) === "paid") paid++;
    } catch (e) {
      console.error("[asaas] consulta:", e);
    }
  }
  revalidatePath("/", "layout");
  back(paid ? `Pagamento confirmado: ${paid} curso(s) liberado(s) para a equipe.` : "Nenhum pagamento novo confirmado ainda.", paid > 0);
}

// ---------------- Super admin ----------------
/** Libera um curso do marketplace para uma empresa sem cobrança (cortesia, parceria...). */
export async function grantLicense(form: FormData) {
  await requireSuperAdmin();
  const companyId = str(form, "company_id");
  const courseId = str(form, "course_id");
  if (companyId && courseId) {
    await service().sql(
      "insert into public.course_licenses (company_id, course_id) select $1, id from public.courses where id = $2 and is_marketplace on conflict do nothing",
      [companyId, courseId]);
  }
  revalidatePath("/", "layout");
  redirect("/admin/marketplace");
}

export async function revokeLicense(form: FormData) {
  await requireSuperAdmin();
  await service().sql("delete from public.course_licenses where company_id = $1 and course_id = $2", [str(form, "company_id"), str(form, "course_id")]);
  revalidatePath("/", "layout");
  redirect("/admin/marketplace");
}
