import "server-only";
import { cache } from "react";
import { randomUUID } from "node:crypto";
import { Db } from "@/lib/db/client";
import { PLATFORM_COMPANY_ID, type PestxIdentity } from "@/lib/pestx";

const service = () => new Db("service", null);

export type CompanyRow = {
  id: string; name: string; pestx: Record<string, string | null>; custom_name: string | null; logo_url: string | null;
  brand_color: string | null; signer_name: string | null; signer_title: string | null; signature_url: string | null;
  cnpj: string | null; billing_email: string | null; asaas_customer_id: string | null; is_platform: boolean;
};

export type Branding = {
  id: string; name: string; legal_name: string | null; logo_url: string | null; color: string;
  signer_name: string | null; signer_title: string; signature_url: string | null; cnpj: string | null; email: string | null;
};

export const DEFAULT_COLOR = "#6d28d9";

/** Dados efetivos da empresa: o que foi personalizado na Academia, senão o que vem do PestX. */
export function toBranding(c: CompanyRow): Branding {
  const p = c.pestx || {};
  return {
    id: c.id,
    name: c.custom_name || p.name || c.name,
    legal_name: p.legal_name || null,
    logo_url: c.logo_url || p.logo_url || null,
    color: /^#[0-9a-f]{6}$/i.test(c.brand_color || "") ? c.brand_color! : DEFAULT_COLOR,
    signer_name: c.signer_name || p.signer_name || null,
    signer_title: c.signer_title || (p.signer_registry ? `Responsável legal · ${p.signer_registry}` : "Responsável legal"),
    signature_url: c.signature_url || p.signature_url || null,
    cnpj: c.cnpj || p.cnpj || null,
    email: c.billing_email || p.email || null,
  };
}

export const getCompanyRow = cache(async (id: string | null | undefined) => {
  if (!id) return null;
  const rows = await service().sql<CompanyRow>("select * from public.companies where id = $1", [id]);
  return rows[0] ?? null;
});

export const getBranding = cache(async (id: string | null | undefined) => {
  const row = await getCompanyRow(id);
  return row ? toBranding(row) : null;
});

/** Cria/atualiza a empresa. Empresa nova recebe canais e categorias padrão. */
async function upsertCompany(id: string, name: string, pestx: Record<string, unknown> | null, isPlatform = false) {
  const db = service();
  const rows = await db.sql<{ inserted: boolean }>(
    `insert into public.companies (id, name, pestx, is_platform) values ($1, $2, coalesce($3::jsonb, '{}'::jsonb), $4)
     on conflict (id) do update set name = excluded.name,
       pestx = case when $3::jsonb is null then public.companies.pestx else excluded.pestx end, updated_at = now()
     returning (xmax = 0) as inserted`,
    [id, name, pestx ? JSON.stringify(pestx) : null, isPlatform],
  );
  if (rows[0]?.inserted) {
    // Instalação antiga (uma empresa só): o que já existia vira da primeira empresa que entrar
    const others = await db.sql<{ n: number }>("select count(*)::int n from public.companies where id <> $1 and not is_platform", [id]);
    if (!isPlatform && others[0]?.n === 0) await db.sql("select public.adopt_orphans($1)", [id]);
    await db.sql("select public.seed_company($1)", [id]);
  }
}

/** Login pelo PestX: garante empresa e perfil na Academia. Devolve o id do usuário (auth.users). */
export async function syncPestxUser(who: PestxIdentity): Promise<{ userId: string } | { error: string }> {
  const db = service();
  if (who.companyId === PLATFORM_COMPANY_ID) await upsertCompany(PLATFORM_COMPANY_ID, "PestX", null, true);
  else await upsertCompany(who.companyId, who.company?.name || "Empresa", who.company);

  let found = (await db.sql<{ id: string; company_id: string | null; is_active: boolean }>(
    "select id, company_id, is_active from public.profiles where pestx_user_id = $1", [who.userId]))[0];
  if (!found) {
    found = (await db.sql<{ id: string; company_id: string | null; is_active: boolean }>(
      "select p.id, p.company_id, p.is_active from auth.users u join public.profiles p on p.id = u.id where u.email = lower($1)", [who.email]))[0];
  }
  if (!found) {
    const r = await db.sql<{ id: string }>(
      "insert into auth.users (email, raw_user_meta_data) values (lower($1), $2) returning id",
      [who.email, JSON.stringify({ full_name: who.name ?? "", company_id: who.companyId })],
    );
    found = { id: r[0]!.id, company_id: who.companyId, is_active: true };
  }
  if (found.is_active === false) return { error: "Seu acesso à Academia está desativado. Fale com o RH." };
  const moved = !!found.company_id && found.company_id !== who.companyId;

  await db.sql(
    `update public.profiles set
       pestx_user_id = $2, company_id = $3, is_super_admin = $4,
       role = case when $5 then 'admin' when $6 then 'employee' else role end,
       job_role_id = case when $6 then null else job_role_id end,
       manager_id = case when $6 then null else manager_id end,
       full_name = coalesce(nullif(full_name, ''), $7, full_name)
     where id = $1`,
    [found.id, who.userId, who.companyId, who.isSuperAdmin, who.isAdmin, moved, who.name],
  );

  // função do PestX (funcoes_exercidas) → função da Academia, se a pessoa ainda não tiver uma
  if (who.jobRole) {
    const cur = await db.sql<{ job_role_id: string | null }>("select job_role_id from public.profiles where id = $1", [found.id]);
    if (!cur[0]?.job_role_id) {
      const jr = await db.sql<{ id: string }>(
        `insert into public.job_roles (company_id, name) values ($1, $2)
         on conflict (company_id, name) do update set name = excluded.name returning id`,
        [who.companyId, who.jobRole],
      );
      await db.sql("update public.profiles set job_role_id = $2 where id = $1", [found.id, jr[0]!.id]);
    }
  }
  return { userId: found.id };
}

/** Sem PestX configurado (desenvolvimento/instalação avulsa): uma empresa local. */
export async function ensureLocalCompany(userId: string, name = "Minha empresa") {
  const db = service();
  const cur = await db.sql<{ company_id: string | null }>("select company_id from public.profiles where id = $1", [userId]);
  if (cur[0]?.company_id) return cur[0].company_id;
  const existing = await db.sql<{ id: string }>("select id from public.companies where not is_platform order by created_at limit 1");
  const id = existing[0]?.id ?? randomUUID();
  if (!existing[0]) await upsertCompany(id, name, null);
  await db.sql("update public.profiles set company_id = $2 where id = $1", [userId, id]);
  return id;
}
