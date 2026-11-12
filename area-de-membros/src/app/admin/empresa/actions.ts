"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { Db } from "@/lib/db/client";
import { UploadError, fileField } from "@/lib/uploads";
import { str } from "@/lib/utils";

export type CompanyState = { error?: string; success?: string } | undefined;

/** Personalização da empresa na Academia (o PestX não é alterado). */
export async function saveCompany(_: CompanyState, form: FormData): Promise<CompanyState> {
  const { profile } = await requireAdmin();
  if (!profile.company_id) return { error: "Sua conta não está ligada a uma empresa." };
  const folder = profile.company_id;
  let logo: string | null, signature: string | null;
  try {
    logo = await fileField(form, "logo", "image", folder);
    signature = await fileField(form, "signature", "image", folder);
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  const color = str(form, "brand_color");
  const cnpj = str(form, "cnpj").replace(/[^\d./-]/g, "");
  await new Db("service", null).sql(
    `update public.companies set custom_name = $2, cnpj = $3, billing_email = $4, brand_color = $5,
       logo_url = $6, signer_name = $7, signer_title = $8, signature_url = $9, updated_at = now() where id = $1`,
    [profile.company_id, str(form, "custom_name") || null, cnpj || null, str(form, "billing_email") || null,
     /^#[0-9a-f]{6}$/i.test(color) ? color : null, logo, str(form, "signer_name") || null, str(form, "signer_title") || null, signature],
  );
  revalidatePath("/", "layout");
  return { success: "Dados da empresa salvos." };
}
