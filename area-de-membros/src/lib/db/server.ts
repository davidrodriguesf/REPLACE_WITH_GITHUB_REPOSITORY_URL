import "server-only";
import { Db } from "./client";
import { destroySession, sessionUserId, setUserPassword } from "./auth";

export type AppClient = Db & {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null } }>;
    signOut: () => Promise<void>;
    updateUser: (p: { password: string }) => Promise<{ error: { message: string } | null }>;
  };
};

/** Cliente do usuário logado: todas as consultas passam pelas regras de acesso (RLS). */
export async function createClient(): Promise<AppClient> {
  const uid = await sessionUserId();
  const db = new Db(uid ? "user" : "anon", uid) as AppClient;
  db.auth = {
    getUser: async () => ({ data: { user: uid ? { id: uid } : null } }),
    signOut: destroySession,
    updateUser: async ({ password }) => {
      if (!uid) return { error: { message: "Sessão expirada." } };
      await setUserPassword(uid, password);
      return { error: null };
    },
  };
  return db;
}
