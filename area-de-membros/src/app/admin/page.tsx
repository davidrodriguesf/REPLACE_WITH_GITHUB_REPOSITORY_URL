import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

export default async function AdminHome() {
  const { supabase } = await requireAdmin();
  const nowIso = new Date().toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const head = { count: "exact" as const, head: true };
  const [students, courses, enrollments, pending, events, posts, { data: hooks }] = await Promise.all([
    supabase.from("profiles").select("*", head).eq("role", "student"),
    supabase.from("courses").select("*", head),
    supabase.from("enrollments").select("*", head).gte("created_at", weekAgo),
    supabase.from("access_requests").select("*", head).eq("status", "pending"),
    supabase.from("events").select("*", head).gte("starts_at", nowIso),
    supabase.from("posts").select("*", head).gte("created_at", weekAgo),
    supabase.from("webhook_events").select("id, event, email, status, error, created_at").order("created_at", { ascending: false }).limit(5),
  ]);
  const stats = [
    { label: "Alunos", value: students.count, href: "/admin/alunos" },
    { label: "Cursos", value: courses.count, href: "/admin/cursos" },
    { label: "Acessos liberados (7 dias)", value: enrollments.count, href: "/admin/alunos" },
    { label: "Solicitações pendentes", value: pending.count, href: "/admin/solicitacoes" },
    { label: "Próximos eventos", value: events.count, href: "/admin/eventos" },
    { label: "Posts na comunidade (7 dias)", value: posts.count, href: "/comunidade" },
  ];
  return (
    <div className="space-y-8">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 hover:shadow-md transition">
            <p className="text-3xl font-bold text-slate-900">{s.value ?? 0}</p>
            <p className="text-sm text-muted mt-1">{s.label}</p>
          </Link>
        ))}
      </div>
      <section className="card p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="h-section">Últimos webhooks da Appmax</h2>
          <Link href="/admin/webhooks" className="link text-sm">Ver todos</Link>
        </div>
        {hooks?.length ? (
          <ul className="divide-y divide-slate-100 text-sm">
            {hooks.map((h) => (
              <li key={h.id} className="py-2 flex flex-wrap gap-x-3">
                <span className="font-medium">{h.event ?? "—"}</span>
                <span className="text-muted">{h.email}</span>
                <StatusBadge status={h.status} />
                <span className="text-muted ml-auto">{formatDateTime(h.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nenhum webhook recebido ainda.</p>
        )}
      </section>
    </div>
  );
}
