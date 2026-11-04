// Copia database/schema.sql para um módulo TS, para o app conseguir criar o banco sozinho.
import { readFileSync, writeFileSync } from "node:fs";
const sql = readFileSync(new URL("../database/schema.sql", import.meta.url), "utf8");
writeFileSync(
  new URL("../src/lib/db/schema-sql.ts", import.meta.url),
  "// Gerado por scripts/embed-schema.mjs a partir de database/schema.sql. Não edite à mão.\nexport const SCHEMA_SQL = " + JSON.stringify(sql) + ";\n",
);
console.log("schema embutido:", sql.length, "caracteres");
