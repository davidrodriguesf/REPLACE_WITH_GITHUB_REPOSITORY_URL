import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemberProfile } from "@/lib/types";

/** Busca nome/foto dos autores (sem expor e-mails) e devolve um mapa id -> perfil. */
export async function getMembersMap(supabase: SupabaseClient, ids: string[]) {
  const unique = [...new Set(ids)].filter(Boolean);
  const map = new Map<string, MemberProfile>();
  if (!unique.length) return map;
  const { data } = await supabase.from("member_profiles").select("*").in("id", unique);
  (data as MemberProfile[] | null)?.forEach((m) => map.set(m.id, m));
  return map;
}
