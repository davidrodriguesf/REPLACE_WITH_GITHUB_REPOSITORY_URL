import "server-only";
import { createHash } from "node:crypto";
import { pool } from "./pool";
import { SCHEMA_SQL } from "./schema-sql";

const g = globalThis as unknown as { __schemaReady?: Promise<void> };

/**
 * Aplica database/schema.sql quando ele muda (o arquivo é idempotente).
 * Roda uma vez ao iniciar o servidor; a versão aplicada fica em public.app_meta.
 */
export function ensureSchema() {
  if (!g.__schemaReady) {
    g.__schemaReady = (async () => {
      const hash = createHash("sha256").update(SCHEMA_SQL).digest("hex");
      const client = await pool().connect();
      try {
        await client.query("select pg_advisory_lock(84211)");
        const ready = await client.query("select to_regclass('public.profiles') is not null as ok");
        // banco vazio: quem cria é a página /primeiro-acesso (com a SETUP_KEY)
        if (!ready.rows[0]?.ok) return;
        await client.query("create table if not exists public.app_meta (key text primary key, value text not null)");
        const cur = await client.query("select value from public.app_meta where key = 'schema_hash'");
        if (cur.rows[0]?.value === hash) return;
        console.log("[academia] atualizando o banco (schema.sql mudou)...");
        await client.query(SCHEMA_SQL);
        await client.query(
          "insert into public.app_meta (key, value) values ('schema_hash', $1) on conflict (key) do update set value = excluded.value",
          [hash],
        );
        console.log("[academia] banco atualizado.");
      } finally {
        await client.query("select pg_advisory_unlock(84211)").catch(() => {});
        client.release();
      }
    })().catch((e) => {
      console.error("[academia] não foi possível atualizar o banco:", e);
      g.__schemaReady = undefined;
    });
  }
  return g.__schemaReady;
}
