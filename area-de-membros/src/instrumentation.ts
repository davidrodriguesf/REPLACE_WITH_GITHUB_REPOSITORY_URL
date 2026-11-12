// Ao iniciar o servidor, aplica as mudanças do banco (database/schema.sql) se houver.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.DATABASE_URL) {
    const { ensureSchema } = await import("./lib/db/migrate");
    await ensureSchema();
  }
}
