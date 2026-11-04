import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getLearning, getTrails } from "@/lib/learning";
import { Cover, ProgressBar } from "@/components/Cards";
import { IconAward, IconCheck, IconChevronLeft, IconLock, IconPlay } from "@/components/Icons";

export default async function TrailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const { byId } = await getLearning(supabase, user.id);
  const trail = (await getTrails(supabase, byId)).find((t) => t.id === id);
  if (!trail) notFound();
  const nextIndex = trail.steps.findIndex((s) => !s.course.completed);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href="/trilhas" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-navy-900"><IconChevronLeft className="w-4 h-4" />Trilhas</Link>
      <div className="rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-6 sm:p-8 text-white">
        {trail.roleNames.length > 0 && <p className="text-sm font-semibold text-brand-100">Trilha · {trail.roleNames.join(" · ")}</p>}
        <h1 className="mt-1 text-3xl font-bold leading-tight">{trail.title}</h1>
        {trail.description && <p className="mt-3 text-white/80 whitespace-pre-wrap">{trail.description}</p>}
        <div className="mt-6 flex items-center gap-4">
          <div className="h-2.5 flex-1 rounded-full bg-white/15 overflow-hidden"><div className="h-full rounded-full bg-white" style={{ width: `${trail.pct}%` }} /></div>
          <span className="font-bold tabular-nums">{trail.pct}%</span>
        </div>
        <p className="mt-2 text-sm text-white/75">{trail.doneCount} de {trail.steps.length} cursos concluídos</p>
      </div>

      <ol className="relative space-y-4">
        <span className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-slate-200" aria-hidden />
        {trail.steps.map(({ course: c, required }, i) => {
          const state = c.completed ? "done" : i === nextIndex ? "current" : "todo";
          return (
            <li key={c.id} className="relative flex gap-4">
              <span className={`relative z-10 mt-4 grid h-12 w-12 shrink-0 place-items-center rounded-full font-bold ring-4 ring-white ${state === "done" ? "bg-emerald-600 text-white" : state === "current" ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                {state === "done" ? <IconCheck /> : i + 1}
              </span>
              <Link href={`/cursos/${c.slug}`} className={`flex-1 min-w-0 rounded-2xl border p-3 sm:p-4 flex gap-4 items-center transition hover:shadow-md ${state === "current" ? "border-brand-600 bg-brand-50/50" : "border-slate-200 bg-white"}`}>
                <div className="w-28 sm:w-40 shrink-0"><Cover title={c.title} url={c.cover_url} rounded="rounded-xl" /></div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="font-bold leading-snug text-navy-950 line-clamp-2">{c.title}</p>
                  <p className="text-sm text-slate-500">{c.totalLessons} aulas{!required ? " · opcional" : ""}{c.hasExam ? " · com prova" : ""}</p>
                  {state !== "todo" && <div className="flex items-center gap-2"><ProgressBar pct={c.pct} className="flex-1" /><span className="text-xs font-semibold text-slate-500">{c.pct}%</span></div>}
                  {c.certificateId && <p className="flex items-center gap-1 text-sm font-semibold text-emerald-700"><IconAward className="w-4 h-4" />Certificado emitido</p>}
                </div>
                <span className={`hidden sm:grid h-10 w-10 shrink-0 place-items-center rounded-full ${state === "todo" ? "text-slate-400" : "border-2 border-brand-600 text-navy-950"}`}>
                  {state === "todo" ? <IconLock className="w-5 h-5" /> : <IconPlay className="w-5 h-5" />}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      {!trail.steps.length && <p className="card p-6 text-slate-500">Esta trilha ainda não tem cursos.</p>}
    </div>
  );
}
