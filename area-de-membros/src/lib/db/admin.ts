import "server-only";
import { Db } from "./client";

/**
 * Acesso como dono do banco (ignora o RLS). Use apenas no servidor,
 * depois de verificar que quem pede tem permissão (ex.: requireAdmin).
 */
export function createAdminClient() {
  return new Db("service", null);
}
