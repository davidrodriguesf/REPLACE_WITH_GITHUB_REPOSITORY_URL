import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { getMembersMap } from "@/lib/members";
import { CourseCard } from "@/components/CourseCard";
import { Avatar } from "@/components/Avatar";
import { formatDateTime, timeAgo } from "@/lib/utils";
import type { EventItem, Post } from "@/lib/types";

export const metadata = { title: "Início" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ bemvindo?: string }> }) {
  const { supabase, user, profile } = await requireUser();
  const sp = await searchParams;
  const [catalog, { data: events }, { data: posts }] = await Promise.all([
    getCatalog(supabase, user.id, profile.role === "admin"),
    supabase.from("events").select("*").eq("is_published", true).gte("starts_at", new Date().toISOString()).order("starts_at").limit(3),
    supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(4),
  ]);
  const members = await getMembersMap(supabase, ((posts ?? []) as Post[]).map((p) => p.author_id));

  const mine = catalog.filter((c) => c.status === "enrolled");
  const free = catalog.filter((c) => c.status === "free_locked" || c.status === "pending");
  const locked = catalog.filter((c) => c.status === "paid_locked");
  const firstName = profile.full_name?.split(" ")[0];

  return (
    <div className="space-y-10">
      {sp.bemvindo && <p className="alert alert-success">Senha criada com sucesso. Bem-vindo(a)! 🎉</p>}
      <div>
        <h1 className="h-page">Olá{firstName ? `, ${firstName}` : ""}! 👋</h1>
        <p className="text-muted mt-1">Continue de onde parou ou explore a comunidade.</p>
      </div>

      <section>
        <h2 className="h-section mb-4">Meus cursos</h2>
        {mine.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{mine.map((c) => <CourseCard key={c.id} course={c} />)}</div>
        ) : (
          <p className="card p-6 text-muted">Você ainda não tem cursos liberados. Veja as opções abaixo.</p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="h-section">Próximos eventos</h2>
            <Link href="/eventos" className="link text-sm">Ver todos</Link>
          </div>
          {(events as EventItem[] | null)?.length ? (
            <ul className="divide-y divide-slate-100">
              {(events as EventItem[]).map((e) => (
                <li key={e.id} className="py-3">
                  <Link href={`/eventos/${e.id}`} className="font-medium hover:text-brand-700">{e.title}</Link>
                  <p className="text-sm text-muted capitalize">{formatDateTime(e.starts_at)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nenhum evento agendado.</p>
          )}
        </section>
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="h-section">Na comunidade</h2>
            <Link href="/comunidade" className="link text-sm">Abrir</Link>
          </div>
          {(posts as Post[] | null)?.length ? (
            <ul className="divide-y divide-slate-100">
              {(posts as Post[]).map((p) => (
                <li key={p.id} className="py-3 flex gap-3">
                  <Avatar name={members.get(p.author_id)?.full_name} url={members.get(p.author_id)?.avatar_url} size={32} />
                  <div className="min-w-0">
                    <Link href={`/comunidade/${p.id}`} className="font-medium hover:text-brand-700 line-clamp-1">{p.title}</Link>
                    <p className="text-xs text-muted">{members.get(p.author_id)?.full_name ?? "Membro"} · {timeAgo(p.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Seja o primeiro a publicar!</p>
          )}
        </section>
      </div>

      {free.length > 0 && (
        <section>
          <h2 className="h-section mb-1">Cursos gratuitos</h2>
          <p className="text-sm text-muted mb-4">Sem custo — solicite e nossa equipe libera para você.</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{free.map((c) => <CourseCard key={c.id} course={c} />)}</div>
        </section>
      )}

      {locked.length > 0 && (
        <section>
          <h2 className="h-section mb-4">Outros cursos</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{locked.map((c) => <CourseCard key={c.id} course={c} />)}</div>
        </section>
      )}
    </div>
  );
}
