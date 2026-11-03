import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getReport, summarize } from "@/lib/reports";
import { ProgressBar } from "@/components/Cards";
import { formatDateTime } from "@/lib/utils";

export default async function AdminHome() {
  const { supabase } = await requireAdmin();
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const head = { count: "exact" as const, head: true };
  const [active, courses, certs, plans, rows, { data: people }, { data: roles }, { data: recentCerts }, { data: attempts }] = await Promise.all([
    supabase.from("profiles").select("*", head).eq("is_active", true),
    supabase.from("courses").select("*", head).eq("is_published", true),
    supabase.from("certificates").select("*", head).gte("issued_at", monthAgo),
    supabase.from("development_plans").select("*", head).eq("status", "active"),
    getReport(supabase),
    supabase.from("profiles").select("id, job_role_id").eq("is_active", true),
    supabase.from("job_roles").select("id, name").order("name"),
    supabase.from("certificates").select("id, issued_at, profiles(full_name), courses(title)").order("issued_at", { ascending: false }).limit(6),
    supabase.from("quiz_attempts").select("score, quizzes(kind)").gte("submitted_at", monthAgo),
  ]);
  const sum = summarize(rows);
  const exams = ((attempts ?? []) as unknown as { score: number; quizzes: { kind: string } | null }[]).filter((a) => a.quizzes?.kind === "exam");
  const examAvg = exams.length ? Math.round(exams.reduce((s, a) => s + a.score, 0) / exams.length) : null;
  const overdue = [...sum.values()].reduce((s, x) => s + x.overdue, 0);

  const byRole = (roles ?? []).map((r) => {
    const members = (people ?? []).filter((p) => p.job_role_id === r.id).map((p) => p.id as string);
    let req = 0, ok = 0;
    for (const m of members) { const s = sum.get(m); if (s) { req += s.required; ok += s.requiredDone; } }
    return { name: r.name as string, members: members.length, pct: req ? Math.round((ok / req) * 100) : 0 };
  });

  const tiles = [
    { label: "Colaboradores ativos", value: active.count ?? 0, href: "/admin/colaboradores" },
    { label: "Cursos publicados", value: courses.count ?? 0, href: "/admin/cursos" },
    { label: "Certificados (30 dias)", value: certs.count ?? 0, href: "/admin/relatorios" },
    { label: "Média nas provas (30 dias)", value: examAvg === null ? "—" : `${examAvg}%`, href: "/admin/relatorios" },
    { label: "PDIs em andamento", value: plans.count ?? 0, href: "/admin/relatorios" },
    { label: "Cursos obrigatórios atrasados", value: overdue, href: "/admin/relatorios?filtro=atrasados" },
  ];

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="rounded-2xl bg-slate-50 p-5 hover:bg-slate-100">
            <p className="text-3xl font-extrabold tracking-tight text-navy-950 tabular-nums">{t.value}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{t.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="h-row mb-4">Conclusão das trilhas por função</h2>
          <ul className="space-y-4 rounded-2xl border border-slate-200 p-5">
            {byRole.map((r) => (
              <li key={r.name}>
                <div className="mb-1.5 flex justify-between text-sm"><span className="font-semibold text-navy-950">{r.name} <span className="font-normal text-slate-400">· {r.members} pessoas</span></span><span className="font-semibold tabular-nums">{r.pct}%</span></div>
                <ProgressBar pct={r.pct} />
              </li>
            ))}
            {!byRole.length && <li className="text-slate-500">Cadastre as funções em <Link href="/admin/funcoes" className="link">Funções</Link>.</li>}
          </ul>
        </section>
        <section>
          <h2 className="h-row mb-4">Últimos certificados</h2>
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {((recentCerts ?? []) as unknown as { id: string; issued_at: string; profiles: { full_name: string } | null; courses: { title: string } | null }[]).map((c) => (
              <li key={c.id} className="px-5 py-3">
                <p className="font-semibold text-navy-950">{c.profiles?.full_name}</p>
                <p className="text-sm text-slate-500">{c.courses?.title} · {formatDateTime(c.issued_at)}</p>
              </li>
            ))}
            {!recentCerts?.length && <li className="px-5 py-4 text-slate-500">Nenhum certificado emitido ainda.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
