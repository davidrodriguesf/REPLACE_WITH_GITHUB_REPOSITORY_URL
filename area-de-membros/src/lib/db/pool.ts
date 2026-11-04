import "server-only";
import { Pool, types } from "pg";

// Datas e números chegam como texto/número simples (igual à API anterior)
types.setTypeParser(1082, (v) => v); // date → "2026-11-04"
types.setTypeParser(1114, (v) => new Date(v + "Z").toISOString()); // timestamp
types.setTypeParser(1184, (v) => new Date(v).toISOString()); // timestamptz
types.setTypeParser(1700, (v) => parseFloat(v)); // numeric
types.setTypeParser(20, (v) => parseInt(v, 10)); // bigint (count)

function connectionString() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL não configurada");
  // channel_binding não é necessário para o driver pg e pode falhar em alguns ambientes
  const u = new URL(raw);
  u.searchParams.delete("channel_binding");
  return u.toString();
}

const g = globalThis as unknown as { __pgPool?: Pool };

/** Pool único por processo (reaproveitado entre requisições). Use a string "-pooler" do Neon. */
export function pool() {
  if (!g.__pgPool) {
    g.__pgPool = new Pool({ connectionString: connectionString(), max: 5, idleTimeoutMillis: 10_000 });
  }
  return g.__pgPool;
}
