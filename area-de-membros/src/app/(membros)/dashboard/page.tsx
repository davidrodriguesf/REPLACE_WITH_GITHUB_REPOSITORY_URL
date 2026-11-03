import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { getMembersMap } from "@/lib/members";
import { CourseCard } from "@/components/CourseCard";
import { EventCard } from "@/components/EventCard";
import { Hero } from "@/components/Hero";
import { Row } from "@/components/Row";
import { rowItem } from "@/components/row-item";
import { Avatar } from "@/components/Avatar";
import { IconChat, IconHeart } from "@/components/Icons";
import { timeAgo } from "@/lib/utils";
import type { EventItem, Post } from "@/lib/types";

export const metadata = { title: "Início" };

type PostRow = Post & { comments: { count: number }[]; post_likes: { count: number }[] };
type EventRow = EventItem & { event_rsvps: { count: number }[] };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ bemvindo?: string }> }) {
  const { supabase, user, profile } = await requireUser();
  const sp = await searchParams;
  const [catalog, { data: events }, { data: posts }, { data: myRsvps }] = await Promise.all([
    getCatalog(supabase, user.id, profile.role === "admin"),
    supabase.from("events").select("*, event_rsvps(count)").eq("is_published", true).gte("starts_at", new Date().toISOString()).order("starts_at").limit(10),
    supabase.from("posts").select("*, comments(count), post_likes(count)").order("created_at", { ascending: false }).limit(10),
    supabase.from("event_rsvps").select("event_id").eq("user_id", user.id),
  ]);
  const postList = (posts ?? []) as PostRow[];
  const members = await getMembersMap(supabase, postList.map((p) => p.author_id));
  const going = new Set((myRsvps ?? []).map((r) => r.event_id as string));

  const mine = catalog.filter((c) => c.status === "enrolled");
  const inProgress = mine
    .filter((c) => c.doneLessons > 0 && c.doneLessons < c.totalLessons)
    .sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""));
  const free = catalog.filter((c) => c.status === "free_locked" || c.status === "pending");
  const locked = catalog.filter((c) => c.status === "paid_locked");
  const featured = inProgress[0] ?? mine[0] ?? locked[0] ?? free[0];
  const firstName = profile.full_name?.split(" ")[0];

  return (
    <div className="space-y-8 sm:space-y-10">
      {featured ? (
        <Hero course={featured} eyebrow={inProgress[0] ? `Continue de onde parou${firstName ? `, ${firstName}` : ""}` : featured.status === "enrolled" ? "Seu curso" : "Em destaque"} />
      ) : (
        <div className="pt-6"><h1 className="h-page">Olá{firstName ? `, ${firstName}` : ""}! 👋</h1><p className="text-muted">Em breve novos cursos por aqui.</p></div>
      )}

      {sp.bemvindo && <p className="alert alert-success relative">Senha criada com sucesso. Bem-vindo(a)! 🎉</p>}

      <div className="relative space-y-8 sm:space-y-10 sm:-mt-24">
        {inProgress.length > 0 && (
          <Row title="Continuar assistindo">
            {inProgress.map((c) => <CourseCard key={c.id} course={c} className={rowItem} />)}
          </Row>
        )}

        {mine.length > 0 && (
          <Row title="Meus cursos">
            {mine.map((c) => <CourseCard key={c.id} course={c} className={rowItem} />)}
          </Row>
        )}

        {(events as EventRow[] | null)?.length ? (
          <Row title="Próximos eventos ao vivo" action={<Link href="/eventos" className="text-sm font-semibold text-slate-600 hover:text-white">Ver todos ›</Link>}>
            {(events as EventRow[]).map((e) => (
              <EventCard key={e.id} event={e} going={going.has(e.id)} count={e.event_rsvps[0]?.count} className={rowItem} />
            ))}
          </Row>
        ) : null}

        {free.length > 0 && (
          <Row title="Cursos gratuitos" subtitle="Sem custo: solicite e nossa equipe libera o acesso para você.">
            {free.map((c) => <CourseCard key={c.id} course={c} className={rowItem} />)}
          </Row>
        )}

        {locked.length > 0 && (
          <Row title="Desbloqueie mais conteúdos">
            {locked.map((c) => <CourseCard key={c.id} course={c} className={rowItem} />)}
          </Row>
        )}

        {postList.length > 0 && (
          <Row title="Em alta na comunidade" action={<Link href="/comunidade" className="text-sm font-semibold text-slate-600 hover:text-white">Abrir comunidade ›</Link>}>
            {postList.map((p) => {
              const a = members.get(p.author_id);
              return (
                <Link
                  key={p.id}
                  href={`/comunidade/${p.id}`}
                  className={`${rowItem} rounded-md bg-surface p-4 flex flex-col gap-3 transition duration-300 hover:bg-surface-2 hover:scale-[1.03] min-h-40`}
                >
                  <div className="flex items-center gap-2">
                    <Avatar name={a?.full_name} url={a?.avatar_url} size={30} square />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{a?.full_name ?? "Membro"}</p>
                      <p className="text-[11px] text-muted">{timeAgo(p.created_at)}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-white text-sm line-clamp-2">{p.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-2">{p.body}</p>
                  <p className="mt-auto flex gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><IconHeart className="w-4 h-4" />{p.post_likes[0]?.count ?? 0}</span>
                    <span className="flex items-center gap-1"><IconChat className="w-4 h-4" />{p.comments[0]?.count ?? 0}</span>
                  </p>
                </Link>
              );
            })}
          </Row>
        )}
      </div>
    </div>
  );
}
