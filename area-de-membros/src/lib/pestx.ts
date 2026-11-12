import "server-only";

/*
 * Leitura do PestX ERP (Supabase do PestX) — SOMENTE LEITURA.
 * Login com o mesmo e-mail e senha do app.pestx.com.br; depois lemos, com o token
 * da própria pessoa (RLS do PestX), o colaborador, o tipo de acesso e a empresa.
 *   usuarios_empresa: auth_user_id, empresa_id, nome, contato_email, "situacao-colaborador_ativo",
 *                     funcoes_exercidas (array), acesso_sistema ('Total' = administrador)
 *   usuarios_app:     auth_user_id/id, tipo (super_admin | admin_empresa | ...), perfil, ativo, empresa_id
 *   empresas:         "dados-empresa_nome-fantasia", "dados-empresa_razao-social", "dados-empresa_cnpj",
 *                     "dados-empresa_url-logo", resp_legal_nome, resp_legal_registro, resp_legal_assinatura,
 *                     saas_overrides.empresa_config (sobrescreve nome, logo, CNPJ)
 */

export const PLATFORM_COMPANY_ID = "00000000-0000-0000-0000-00000000a001";

const url = () => (process.env.PESTX_SUPABASE_URL || "").replace(/\/$/, "");
const key = () => process.env.PESTX_SUPABASE_ANON_KEY || "";
export const pestxEnabled = () => !!(url() && key());

type Json = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export type PestxIdentity = {
  userId: string;
  email: string;
  name: string | null;
  companyId: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  jobRole: string | null;
  company: { name: string; legal_name: string | null; cnpj: string | null; logo_url: string | null; email: string | null;
             signer_name: string | null; signer_registry: string | null; signature_url: string | null } | null;
};

export class PestxError extends Error {
  constructor(message: string, public kind: "credentials" | "access" | "unavailable") { super(message); }
}

async function rest(path: string, token: string): Promise<Json[]> {
  const res = await fetch(`${url()}/rest/v1/${path}`, {
    headers: { apikey: key(), Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`PestX ${path.split("?")[0]}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as Json[];
}

/** Confere e-mail e senha no PestX e devolve quem é a pessoa e de qual empresa. */
export async function pestxSignIn(email: string, password: string): Promise<PestxIdentity> {
  let res: Response;
  try {
    res = await fetch(`${url()}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: key(), "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    console.error("[pestx] login indisponível:", e);
    throw new PestxError("Não foi possível falar com o PestX agora. Tente de novo em instantes.", "unavailable");
  }
  if (res.status === 400 || res.status === 401 || res.status === 422) throw new PestxError("E-mail ou senha incorretos.", "credentials");
  if (!res.ok) throw new PestxError("Não foi possível falar com o PestX agora. Tente de novo em instantes.", "unavailable");
  const tok = (await res.json()) as { access_token: string; user: { id: string; email: string } };
  const uid = tok.user.id;
  const t = tok.access_token;

  try {
    const [colabs, apps] = await Promise.all([
      rest(`usuarios_empresa?select=*&auth_user_id=eq.${uid}&limit=20`, t),
      rest(`usuarios_app?select=*&or=(auth_user_id.eq.${uid},id.eq.${uid})&limit=1`, t).catch(() => [] as Json[]),
    ]);
    const ativos = colabs.filter((r) => r["situacao-colaborador_ativo"] !== false);
    const app = apps[0];
    const appAtivo = !!app && app.ativo !== false;
    const isSuperAdmin = appAtivo && app!.tipo === "super_admin";
    if (!ativos.length && !appAtivo) {
      throw new PestxError(colabs.length ? "Seu acesso está desativado no PestX. Fale com o escritório." : "Seu login do PestX não está ligado a nenhuma empresa.", "access");
    }
    const c = ativos[0];
    const companyId = s(c?.empresa_id) || s(app?.empresa_id) || (isSuperAdmin ? PLATFORM_COMPANY_ID : null);
    if (!companyId) throw new PestxError("Seu login do PestX não está ligado a nenhuma empresa.", "access");
    const isAdmin =
      isSuperAdmin ||
      String(c?.acesso_sistema ?? "").trim().toLowerCase() === "total" ||
      (appAtivo && app!.tipo === "admin_empresa" && (String(app!.perfil ?? "Total").trim() || "Total") === "Total");
    const funcoes = Array.isArray(c?.funcoes_exercidas) ? (c!.funcoes_exercidas as unknown[]).map(s).filter(Boolean) as string[] : [];

    let company: PestxIdentity["company"] = null;
    if (companyId !== PLATFORM_COMPANY_ID) {
      const e = (await rest(`empresas?select=*&id=eq.${companyId}&limit=1`, t).catch(() => [] as Json[]))[0];
      if (e) {
        const ov = ((e.saas_overrides as Json | null)?.empresa_config as Json | undefined) || {};
        const pick = (o: string, col: string) => s(ov[o]) ?? s(e[col]);
        company = {
          name: pick("nomeFantasia", "dados-empresa_nome-fantasia") || pick("razaoSocial", "dados-empresa_razao-social") || "Empresa",
          legal_name: pick("razaoSocial", "dados-empresa_razao-social"),
          cnpj: pick("cnpj", "dados-empresa_cnpj"),
          logo_url: pick("logo", "dados-empresa_url-logo"),
          email: pick("email", "contato_email"),
          signer_name: s(e.resp_legal_nome),
          signer_registry: s(e.resp_legal_registro),
          signature_url: s(e.resp_legal_assinatura),
        };
      }
    }
    return {
      userId: uid,
      email: (s(tok.user.email) || email).toLowerCase(),
      name: s(c?.nome),
      companyId,
      isAdmin,
      isSuperAdmin,
      jobRole: funcoes[0] ?? null,
      company,
    };
  } catch (e) {
    if (e instanceof PestxError) throw e;
    console.error("[pestx] leitura do perfil falhou:", e);
    throw new PestxError("Entramos no PestX, mas não conseguimos ler seu cadastro. Tente de novo.", "unavailable");
  }
}
