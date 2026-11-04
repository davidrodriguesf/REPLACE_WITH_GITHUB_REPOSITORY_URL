import "server-only";
import { pool } from "./pool";

/*
 * Cliente de banco com a mesma "cara" da API que o app já usava:
 *   db.from("courses").select("*, lessons(count)").eq("id", x).maybeSingle()
 *   db.rpc("submit_quiz", { qid, answers })
 * Cada operação vira SQL parametrizado e roda numa transação curta como:
 *   - "user":    papel authenticated + id do colaborador → RLS aplicado
 *   - "anon":    papel anon (páginas públicas)
 *   - "service": dono do banco (só no servidor, após checar permissões)
 */

export type Mode = "user" | "anon" | "service";
export type DbError = { message: string; code?: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;
export type DbResult<T = Row[]> = { data: T; error: DbError | null; count: number | null };

type Rel = { table: string; many?: string; one?: string };
// Relações usadas nos selects aninhados: "pai.embed" → tabela + chave
const REL: Record<string, Rel> = {
  "posts.comments": { table: "comments", many: "post_id" },
  "posts.post_likes": { table: "post_likes", many: "post_id" },
  "posts.spaces": { table: "spaces", one: "space_id" },
  "events.event_rsvps": { table: "event_rsvps", many: "event_id" },
  "courses.lessons": { table: "lessons", many: "course_id" },
  "courses.quizzes": { table: "quizzes", many: "course_id" },
  "courses.certificates": { table: "certificates", many: "course_id" },
  "quizzes.quiz_questions": { table: "quiz_questions", many: "quiz_id" },
  "quiz_questions.quiz_options": { table: "quiz_options", many: "question_id" },
  "certificates.courses": { table: "courses", one: "course_id" },
  "certificates.profiles": { table: "profiles", one: "user_id" },
  "plan_goals.courses": { table: "courses", one: "course_id" },
  "assignments.courses": { table: "courses", one: "course_id" },
  "quiz_attempts.quizzes": { table: "quizzes", one: "quiz_id" },
  "lesson_progress.lessons": { table: "lessons", one: "lesson_id" },
  "course_instructors.instructors": { table: "instructors", one: "instructor_id" },
  "trail_courses.courses": { table: "courses", one: "course_id" },
  "trail_job_roles.trails": { table: "trails", one: "trail_id" },
  "trail_job_roles.job_roles": { table: "job_roles", one: "job_role_id" },
};

// Chaves usadas no upsert quando não informadas
const PK: Record<string, string[]> = {
  lesson_progress: ["user_id", "lesson_id"],
  post_likes: ["post_id", "user_id"],
  event_rsvps: ["event_id", "user_id"],
  trail_courses: ["trail_id", "course_id"],
  trail_job_roles: ["trail_id", "job_role_id"],
  course_job_roles: ["course_id", "job_role_id"],
  course_instructors: ["course_id", "instructor_id"],
  assignments: ["user_id", "course_id"],
};

// Funções que devolvem várias linhas (as demais devolvem um valor)
const SET_FUNCTIONS = new Set(["learning_report", "trending_courses", "verify_certificate"]);

const IDENT = /^[a-z_][a-z0-9_]*$/;
function ident(name: string) {
  if (!IDENT.test(name)) throw new Error(`Nome inválido: ${name}`);
  return `"${name}"`;
}

function splitTop(s: string) {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

async function run(mode: Mode, uid: string | null, text: string, params: unknown[]) {
  const client = await pool().connect();
  try {
    await client.query("begin");
    if (mode !== "service") {
      await client.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true)", [
        mode === "user" ? uid ?? "" : "",
        mode === "user" ? "authenticated" : "anon",
      ]);
      await client.query(mode === "user" ? "set local role authenticated" : "set local role anon");
    }
    const res = await client.query(text, params);
    await client.query("commit");
    return res;
  } catch (e) {
    await client.query("rollback").catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}

function toError(e: unknown): DbError {
  const err = e as { message?: string; code?: string };
  if (process.env.NODE_ENV !== "production") console.error("[db]", err.message);
  return { message: err.message ?? "Erro no banco de dados", code: err.code };
}

type Filter = (p: (v: unknown) => string) => string;

class Query implements PromiseLike<DbResult<Row[]>> {
  private filters: Filter[] = [];
  private sorts: string[] = [];
  private lim: number | null = null;
  private cols: string | null = null;
  private countHead = false;
  private mode: "many" | "single" | "maybe" = "many";
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private values: Record<string, unknown>[] = [];
  private conflict: string[] | null = null;
  private ignoreDup = false;

  constructor(private db: Db, private table: string) {
    ident(table);
  }

  // ---------- operações ----------
  select(cols = "*", opts?: { count?: string; head?: boolean }) {
    this.cols = cols;
    if (opts?.head) this.countHead = true;
    return this;
  }
  insert(v: Record<string, unknown> | Record<string, unknown>[]) {
    this.op = "insert";
    this.values = Array.isArray(v) ? v : [v];
    return this;
  }
  upsert(v: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.op = "upsert";
    this.values = Array.isArray(v) ? v : [v];
    this.conflict = opts?.onConflict ? opts.onConflict.split(",").map((s) => s.trim()) : PK[this.table] ?? ["id"];
    this.ignoreDup = !!opts?.ignoreDuplicates;
    return this;
  }
  update(v: Record<string, unknown>) {
    this.op = "update";
    this.values = [v];
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }

  // ---------- filtros ----------
  private cmp(col: string, sql: string, v: unknown) {
    this.filters.push((p) => `t.${ident(col)} ${sql} ${p(v)}`);
    return this;
  }
  eq(col: string, v: unknown) {
    if (v === null) {
      this.filters.push(() => `t.${ident(col)} is null`);
      return this;
    }
    return this.cmp(col, "=", v);
  }
  neq(col: string, v: unknown) { return this.cmp(col, "<>", v); }
  gt(col: string, v: unknown) { return this.cmp(col, ">", v); }
  gte(col: string, v: unknown) { return this.cmp(col, ">=", v); }
  lt(col: string, v: unknown) { return this.cmp(col, "<", v); }
  lte(col: string, v: unknown) { return this.cmp(col, "<=", v); }
  in(col: string, arr: unknown[]) {
    this.filters.push((p) => `t.${ident(col)} = any(${p(arr)})`);
    return this;
  }
  /** Ex.: "email.ilike.%ana%,full_name.ilike.%ana%" */
  or(expr: string) {
    const parts = expr.split(",").map((s) => {
      const [col, op, ...rest] = s.split(".");
      return { col: col!, op: op!, val: rest.join(".") };
    });
    this.filters.push(
      (p) =>
        "(" +
        parts
          .map(({ col, op, val }) => {
            const o = { eq: "=", ilike: "ilike", like: "like" }[op];
            if (!o) throw new Error(`Operador não suportado: ${op}`);
            return `t.${ident(col)}::text ${o} ${p(val)}`;
          })
          .join(" or ") +
        ")",
    );
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.sorts.push(`t.${ident(col)} ${opts?.ascending === false ? "desc" : "asc"}`);
    return this;
  }
  limit(n: number) {
    this.lim = Math.max(0, Math.floor(n));
    return this;
  }
  single<T = Row>(): PromiseLike<DbResult<T>> {
    this.mode = "single";
    return this as unknown as PromiseLike<DbResult<T>>;
  }
  maybeSingle<T = Row>(): PromiseLike<DbResult<T | null>> {
    this.mode = "maybe";
    return this as unknown as PromiseLike<DbResult<T | null>>;
  }

  // ---------- SQL ----------
  private selectList(table: string, alias: string, cols: string): string {
    return splitTop(cols)
      .map((c) => {
        if (c === "*") return `${alias}.*`;
        const open = c.indexOf("(");
        if (open === -1) return `${alias}.${ident(c)}`;
        const name = c.slice(0, open).split("!")[0]!.trim();
        const inner = c.slice(open + 1, -1).trim();
        const rel = REL[`${table}.${name}`];
        if (!rel) throw new Error(`Relação não mapeada: ${table}.${name}`);
        const sub = `${alias}_${name}`;
        if (rel.many) {
          if (inner === "count") {
            return `json_build_array(json_build_object('count', (select count(*) from public.${ident(rel.table)} ${sub} where ${sub}.${ident(rel.many)} = ${alias}.id)::int)) as ${ident(name)}`;
          }
          return `(select coalesce(json_agg(${this.jsonObj(rel.table, sub, inner)}), '[]'::json) from public.${ident(rel.table)} ${sub} where ${sub}.${ident(rel.many)} = ${alias}.id) as ${ident(name)}`;
        }
        return `(select ${this.jsonObj(rel.table, sub, inner)} from public.${ident(rel.table)} ${sub} where ${sub}.id = ${alias}.${ident(rel.one!)}) as ${ident(name)}`;
      })
      .join(", ");
  }

  private jsonObj(table: string, alias: string, cols: string) {
    if (cols === "*" || cols === "") return `row_to_json(${alias})`;
    const parts = splitTop(cols).map((c) => {
      if (c.includes("(")) {
        const name = c.slice(0, c.indexOf("(")).split("!")[0]!.trim();
        return `'${name}', (select x.${ident(name)} from (select ${this.selectList(table, alias + "i", c)} from public.${ident(table)} ${alias}i where ${alias}i.id = ${alias}.id) x)`;
      }
      return `'${ident(c).slice(1, -1)}', ${alias}.${ident(c)}`;
    });
    return `json_build_object(${parts.join(", ")})`;
  }

  private build() {
    const params: unknown[] = [];
    const p = (v: unknown) => {
      params.push(v !== null && typeof v === "object" && !Array.isArray(v) ? JSON.stringify(v) : v);
      return `$${params.length}`;
    };
    const t = `public.${ident(this.table)}`;
    const where = this.filters.length ? ` where ${this.filters.map((f) => f(p)).join(" and ")}` : "";
    const returning = this.cols ? ` returning ${this.selectList(this.table, "t", this.cols)}` : "";

    if (this.op === "select") {
      if (this.countHead) return { text: `select count(*)::int as count from ${t} t${where}`, params };
      let text = `select ${this.selectList(this.table, "t", this.cols ?? "*")} from ${t} t${where}`;
      if (this.sorts.length) text += ` order by ${this.sorts.join(", ")}`;
      if (this.lim !== null) text += ` limit ${this.lim}`;
      return { text, params };
    }
    if (this.op === "delete") return { text: `delete from ${t} t${where}${returning}`, params };
    if (this.op === "update") {
      const v = this.values[0]!;
      const sets = Object.keys(v).filter((k) => v[k] !== undefined).map((k) => `${ident(k)} = ${p(v[k])}`);
      return { text: `update ${t} t set ${sets.join(", ")}${where}${returning}`, params };
    }
    // insert / upsert
    const keys = [...new Set(this.values.flatMap((r) => Object.keys(r).filter((k) => r[k] !== undefined)))];
    const rows = this.values.map((r) => `(${keys.map((k) => (r[k] === undefined ? "default" : p(r[k]))).join(", ")})`);
    let text = `insert into ${t} as t (${keys.map(ident).join(", ")}) values ${rows.join(", ")}`;
    if (this.op === "upsert") {
      const conflict = this.conflict!;
      const upd = keys.filter((k) => !conflict.includes(k));
      text += ` on conflict (${conflict.map(ident).join(", ")}) ` + (this.ignoreDup || !upd.length ? "do nothing" : `do update set ${upd.map((k) => `${ident(k)} = excluded.${ident(k)}`).join(", ")}`);
    }
    return { text: text + returning, params };
  }

  async execute(): Promise<DbResult<Row>> {
    try {
      const { text, params } = this.build();
      const res = await run(this.db.mode, this.db.uid, text, params);
      if (this.op === "select" && this.countHead) return { data: null, error: null, count: res.rows[0]?.count ?? 0 };
      const rows = res.rows;
      if (this.mode === "single") {
        if (rows.length !== 1) return { data: null, error: { message: rows.length ? "Mais de um resultado" : "Nenhum resultado", code: "PGRST116" }, count: null };
        return { data: rows[0], error: null, count: null };
      }
      if (this.mode === "maybe") return { data: rows[0] ?? null, error: null, count: null };
      return { data: this.op === "select" || this.cols ? rows : null, error: null, count: rows.length };
    } catch (e) {
      return { data: null, error: toError(e), count: null };
    }
  }

  then<A = DbResult<Row[]>, B = never>(ok?: ((v: DbResult<Row[]>) => A | PromiseLike<A>) | null, fail?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return this.execute().then(ok as (v: DbResult<Row>) => A | PromiseLike<A>, fail);
  }
}

export class Db {
  constructor(public mode: Mode, public uid: string | null) {}

  from(table: string) {
    return new Query(this, table);
  }

  async rpc(fn: string, args: Record<string, unknown> = {}): Promise<DbResult<Row>> {
    try {
      const params: unknown[] = [];
      const named = Object.entries(args).map(([k, v]) => {
        params.push(v !== null && typeof v === "object" && !Array.isArray(v) ? JSON.stringify(v) : v);
        return `${ident(k)} => $${params.length}`;
      });
      const call = `public.${ident(fn)}(${named.join(", ")})`;
      if (SET_FUNCTIONS.has(fn)) {
        const res = await run(this.mode, this.uid, `select * from ${call}`, params);
        return { data: res.rows, error: null, count: res.rows.length };
      }
      const res = await run(this.mode, this.uid, `select ${call} as r`, params);
      return { data: res.rows[0]?.r ?? null, error: null, count: null };
    } catch (e) {
      return { data: null, error: toError(e), count: null };
    }
  }

  /** Executa um script com vários comandos (sem parâmetros). Só no modo service. */
  async script(text: string) {
    if (this.mode !== "service") throw new Error("script() só pode rodar como service");
    const client = await pool().connect();
    try {
      await client.query(text);
    } finally {
      client.release();
    }
  }

  /** SQL direto (somente no servidor, para autenticação e tarefas internas). */
  async sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
    const res = await run(this.mode, this.uid, text, params);
    return res.rows as T[];
  }
}

export type DbClient = Db;
