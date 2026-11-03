import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getLearning, getTrails } from "@/lib/learning";
import { ContinueCard, CourseCard, ProgressBar, Row, TopCard, rowItem, rowItemWide } from "@/components/Cards";
import { EventCard } from "@/components/EventCard";
import { HomeTabs } from "@/components/HomeTabs";
import { IconChevronRight, IconRoute } from "@/components/Icons";
import { formatDate } from "@/lib/utils";
import type { EventItem } from "@/lib/types";

export const metadata = { title: "Início" };

export default async function Inicio({ searchParams }: { searchParams: Promise<{ bemvindo?: string }> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireUser();
  const { courses, byId, categories } = await getLearning(supabase, user.id);
  const [trails, { data: trending }, { data: events }] = await Promise.all([
    getTrails(supabase, byId),
    supabase.rpc("trending_courses", { lim: 10 }),
    supabase.from("events").select("*").eq("is_published", true).gte("starts_at", new Date(Date.now() - 2 * 3600e3).toISOString()).order("starts_at").limit(6),
  ]);

  const firstName = profile.full_name?.split(" ")[0] ?? "";
  const restName = profile.full_name?.split(" ").slice(1).join(" ");
  const inProgress = courses.filter((c) => c.started && !c.completed).sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""));
  const required = courses.filter((c) => c.assigned && !c.completed).sort((a, b) => (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9"));
  let top = ((trending ?? []) as { course_id: string }[]).map((t) => byId.get(t.course_id)).filter(Boolean) as typeof courses;
  if (top.length < 3) top = [...top, ...courses.filter((c) => c.is_featured && !top.includes(c))].slice(0, 10);
  const featured = courses.filter((c) => c.is_featured);
  const trail = trails[0];

  return (
    <div className="space-y-10">
      {sp.bemvindo && <p className="alert alert-success">Senha criada! Bem-vindo(a) à plataforma. 🎉</p>}
      <div className="space-y-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-navy-950">
          Bem-vindo, <span className="font-medium text-slate-500">{firstName}{restName ? ` ${restName}` : ""}.</span>
        </h1>
        <HomeTabs active="/inicio" />
      </div>

      {trail && (
        <Link href={`/trilhas/${trail.id}`} className="group block rounded-3xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-700 p-6 sm:p-8 text-white shadow-lg shadow-navy-950/20">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-gold-500"><IconRoute className="w-5 h-5" /> Sua trilha{trail.roleNames[0] ? ` · ${trail.roleNames[0]}` : ""}</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold leading-tight">{trail.title}</h2>
              {trail.next ? (
                <p className="mt-2 text-white/70">Próximo passo: <span className="text-white font-semibold">{trail.next.title}</span></p>
              ) : (
                <p className="mt-2 text-emerald-300 font-semibold">Trilha concluída. Parabéns!</p>
              )}
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 transition group-hover:bg-white/20"><IconChevronRight /></span>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <div className="h-2.5 flex-1 rounded-full bg-white/15 overflow-hidden"><div className="h-full rounded-full bg-gold-500" style={{ width: `${trail.pct}%` }} /></div>
            <span className="font-bold tabular-nums">{trail.pct}%</span>
          </div>
          <p className="mt-2 text-sm text-white/60">{trail.doneCount} de {trail.steps.length} cursos concluídos</p>
        </Link>
      )}

      {required.length > 0 && (
        <Row title="Obrigatórios para você">
          {required.map((c) => (
            <div key={c.id} className={rowItem}>
              <CourseCard course={c} />
              {c.dueDate && <p className="mt-1 px-0.5 text-sm font-semibold text-gold-600">Prazo: {formatDate(c.dueDate)}</p>}
            </div>
          ))}
        </Row>
      )}

      {inProgress.length > 0 && (
        <Row title="Continuar Estudando">
          {inProgress.map((c) => <ContinueCard key={c.id} course={c} className={rowItemWide} />)}
        </Row>
      )}

      {top.length > 0 && (
        <Row title="Conteúdos em Alta">
          {top.slice(0, 10).map((c, i) => <TopCard key={c.id} course={c} rank={i + 1} className={rowItemWide} />)}
        </Row>
      )}

      {featured.length > 0 && (
        <Row title="Recomendados para você">
          {featured.map((c) => <CourseCard key={c.id} course={c} className={rowItem} />)}
        </Row>
      )}

      {(events as EventItem[] | null)?.length ? (
        <Row title="Próximos eventos" action={<Link href="/agenda" className="link text-sm whitespace-nowrap">Ver agenda</Link>}>
          {(events as EventItem[]).map((e) => <EventCard key={e.id} event={e} className={rowItem} />)}
        </Row>
      ) : null}

      {categories.map((cat) => {
        const items = courses.filter((c) => c.category_id === cat.id);
        if (!items.length) return null;
        return (
          <Row key={cat.id} title={cat.name}>
            {items.map((c) => <CourseCard key={c.id} course={c} className={rowItem} />)}
          </Row>
        );
      })}

      {!courses.length && (
        <div className="card p-8 text-center text-slate-500">Nenhum curso disponível para você ainda. Assim que o RH publicar conteúdos, eles aparecem aqui.</div>
      )}
    </div>
  );
}
