import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a SERVICE ROLE: ignora o RLS. Use apenas no servidor,
 * em rotas confiáveis (webhook, convites feitos pelo admin).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
