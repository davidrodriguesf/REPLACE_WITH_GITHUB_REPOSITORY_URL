import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { toggleLessonComplete } from "../../../../actions";
import { SubmitButton } from "@/components/ui";
import { IconCheck, IconDownload, IconPlay } from "@/components/Icons";
import { toEmbedUrl } from "@/lib/utils";
import type { Course, Lesson, Module } from "@/lib/types";

export default async function LessonPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const { slug, lessonId } = await params;
  const { supabase, user } = await requireUser();
  const { data: course } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle<Course>();
  if (!course) notFound();

  const { data: lesson } = await supabase.from("lessons").select("*").eq("id", lessonId).eq("course_id", course.id).maybeSingle<Lesson>();
  // RLS: se o aluno não tem acesso, a aula não volta
  if (!lesson) redirect(`/cursos/${slug}`);

  const [{ data: modules }, { data: lessons }, { data: progress }] = await Promise.all([
    supabase.from("modules").select("*").eq("course_id", course.id).order("position"),
    supabase.from("lessons").select("id, module_id, title, duration_minutes, position").eq("course_id", course.id).order("position"),
    supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id),
  ]);
  const mods = (modules ?? []) as Module[];
  const ordered = mods.flatMap((m) => ((lessons ?? []) as Lesson[]).filter((l) => l.module_id === m.id));
  const idx = ordered.findIndex((l) => l.id === lesson.id);
  const prev = ordered[idx - 1];
  const next = ordered[idx + 1];
  const done = new Set((progress ?? []).map((p) => p.lesson_id as string));
  const isDone = done.has(lesson.id);
  const embed = toEmbedUrl(lesson.video_url);
  const pct = ordered.length ? Math.round((ordered.filter((l) => done.has(l.id)).length / ordered.length) * 100) : 0;
  const currentModule = mods.find((m) => m.id === lesson.module_id);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5 min-w-0">
        <Link href={`/cursos/${slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-white">‹ {course.title}</Link>
        <div className="bleed sm:mx-0 aspect-video sm:rounded-lg overflow-hidden bg-black shadow-2xl shadow-black/60">
          {embed ? (
            <iframe src={embed} className="w-full h-full" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen title={lesson.title} />
          ) : (
            <div className="w-full h-full grid place-items-center text-slate-500">Esta aula não tem vídeo.</div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-700">
              Aula {idx + 1} de {ordered.length}{currentModule ? ` · ${currentModule.title}` : ""}
            </p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">{lesson.title}</h1>
            {lesson.description && <p className="text-slate-600 mt-2 max-w-3xl">{lesson.description}</p>}
          </div>
          <div className="flex gap-2 shrink-0">
            <form action={toggleLessonComplete}>
              <input type="hidden" name="lesson_id" value={lesson.id} />
              <input type="hidden" name="done" value={isDone ? "1" : "0"} />
              <input type="hidden" name="next_url" value={next ? `/cursos/${slug}/aula/${next.id}` : ""} />
              <SubmitButton variant={isDone ? "secondary" : "light"} pendingText="...">
                <IconCheck className="w-4 h-4" /> {isDone ? "Concluída" : next ? "Concluir e avançar" : "Concluir"}
              </SubmitButton>
            </form>
          </div>
        </div>

        {(lesson.content || lesson.attachment_url) && (
          <div className="rounded-md bg-surface p-5 sm:p-6 space-y-4">
            {lesson.content && <div className="prose-lite">{lesson.content}</div>}
            {lesson.attachment_url && (
              <a href={lesson.attachment_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                <IconDownload className="w-4 h-4" /> Material complementar
              </a>
            )}
          </div>
        )}

        <div className="flex justify-between gap-3">
          {prev ? <Link href={`/cursos/${slug}/aula/${prev.id}`} className="btn btn-secondary">‹ Anterior</Link> : <span />}
          {next && <Link href={`/cursos/${slug}/aula/${next.id}`} className="btn btn-secondary">Próxima ›</Link>}
        </div>
      </div>

      <aside className="rounded-lg bg-surface h-fit xl:sticky xl:top-20 overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <p className="font-bold text-white">{course.title}</p>
          <div className="mt-2 h-1 rounded bg-white/10 overflow-hidden"><div className="h-full bg-brand-600" style={{ width: `${pct}%` }} /></div>
          <p className="text-xs text-muted mt-1">{pct}% concluído</p>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          {mods.map((m) => (
            <div key={m.id}>
              <p className="px-4 pt-4 pb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">{m.title}</p>
              {ordered.filter((l) => l.module_id === m.id).map((l) => {
                const current = l.id === lesson.id;
                return (
                  <Link
                    key={l.id}
                    href={`/cursos/${slug}/aula/${l.id}`}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition ${current ? "bg-white/10 text-white font-semibold" : "text-slate-600 hover:bg-white/5 hover:text-white"}`}
                  >
                    <span className={`grid place-items-center w-6 h-6 rounded-full shrink-0 text-[11px] ${done.has(l.id) ? "bg-brand-600 text-white" : current ? "bg-white text-black" : "border border-slate-300 text-slate-500"}`}>
                      {done.has(l.id) ? <IconCheck className="w-3.5 h-3.5" /> : current ? <IconPlay className="w-3.5 h-3.5" /> : ordered.indexOf(l) + 1}
                    </span>
                    <span className="flex-1 leading-snug">{l.title}</span>
                    {l.duration_minutes ? <span className="text-xs text-slate-400">{l.duration_minutes}min</span> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
