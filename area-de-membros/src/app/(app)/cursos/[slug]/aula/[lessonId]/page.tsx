import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { toggleLessonComplete } from "../../../../actions";
import { ProgressBar } from "@/components/Cards";
import { SubmitButton } from "@/components/ui";
import { IconCheck, IconChevronLeft, IconDownload, IconPlay, IconQuiz, IconX } from "@/components/Icons";
import { toEmbedUrl } from "@/lib/utils";
import type { Course, Lesson, Module, Quiz } from "@/lib/types";

export default async function LessonPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const { slug, lessonId } = await params;
  const { supabase, user } = await requireUser();
  const { data: course } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle<Course>();
  if (!course) notFound();
  const { data: lesson } = await supabase.from("lessons").select("*").eq("id", lessonId).eq("course_id", course.id).maybeSingle<Lesson>();
  if (!lesson) redirect(`/cursos/${slug}`);

  const [{ data: modules }, { data: lessons }, { data: progress }, { data: quizzes }] = await Promise.all([
    supabase.from("modules").select("*").eq("course_id", course.id).order("position"),
    supabase.from("lessons").select("id, module_id, title, duration_minutes, position").eq("course_id", course.id).order("position"),
    supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id),
    supabase.from("quizzes").select("*").eq("course_id", course.id).eq("is_published", true),
  ]);
  const mods = (modules ?? []) as Module[];
  const ordered = mods.flatMap((m) => ((lessons ?? []) as Lesson[]).filter((l) => l.module_id === m.id));
  const idx = ordered.findIndex((l) => l.id === lesson.id);
  const next = ordered[idx + 1];
  const prev = ordered[idx - 1];
  const done = new Set((progress ?? []).map((p) => p.lesson_id as string));
  const isDone = done.has(lesson.id);
  const doneCount = ordered.filter((l) => done.has(l.id)).length;
  const pct = ordered.length ? Math.round((doneCount / ordered.length) * 100) : 0;
  const embed = toEmbedUrl(lesson.video_url);
  const lessonQuiz = ((quizzes ?? []) as Quiz[]).find((q) => q.lesson_id === lesson.id);
  const exam = ((quizzes ?? []) as Quiz[]).find((q) => q.kind === "exam");
  const allDoneAfter = doneCount + (isDone ? 0 : 1) >= ordered.length;
  const nextUrl = next ? `/cursos/${slug}/aula/${next.id}` : exam && allDoneAfter ? `/cursos/${slug}/avaliacao/${exam.id}` : `/cursos/${slug}`;

  return (
    <div className="-mx-4 sm:mx-0 -mt-6 sm:mt-0 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
      <div className="min-w-0">
        <div className="bg-black sm:rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 sm:hidden">
            <Link href={`/cursos/${slug}`} aria-label="Voltar" className="grid h-11 w-11 place-items-center text-white"><IconChevronLeft /></Link>
            <Link href={`/cursos/${slug}`} aria-label="Fechar" className="grid h-11 w-11 place-items-center text-white"><IconX /></Link>
          </div>
          <div className="aspect-video">
            {embed ? (
              <iframe src={embed} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen title={lesson.title} />
            ) : (
              <div className="grid h-full place-items-center text-white/60">Esta aula não tem vídeo.</div>
            )}
          </div>
        </div>

        <div className="px-4 sm:px-0 pt-5 space-y-5">
          <div>
            <Link href={`/cursos/${slug}`} className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-navy-900 mb-2"><IconChevronLeft className="w-4 h-4" />{course.title}</Link>
            <h1 className="text-2xl sm:text-[28px] font-bold leading-tight text-navy-950">{lesson.title}</h1>
            {lesson.description && <p className="mt-2 text-slate-600">{lesson.description}</p>}
          </div>

          <div className="flex flex-wrap gap-3">
            <form action={toggleLessonComplete} className="flex-1 min-w-[200px]">
              <input type="hidden" name="lesson_id" value={lesson.id} />
              <input type="hidden" name="course_id" value={course.id} />
              <input type="hidden" name="done" value={isDone ? "1" : "0"} />
              <input type="hidden" name="next_url" value={nextUrl} />
              <SubmitButton variant={isDone ? "secondary" : "primary"} className="w-full" pendingText="Salvando...">
                <IconCheck className="w-5 h-5" /> {isDone ? "Aula concluída" : next ? "Concluir e avançar" : "Concluir aula"}
              </SubmitButton>
            </form>
            {lesson.attachment_url && (
              <a href={lesson.attachment_url} target="_blank" rel="noopener noreferrer" className="btn btn-soft flex-1 min-w-[200px]"><IconDownload className="w-5 h-5" />Material da aula</a>
            )}
            {lessonQuiz && (
              <Link href={`/cursos/${slug}/avaliacao/${lessonQuiz.id}`} className="btn btn-soft flex-1 min-w-[200px]"><IconQuiz className="w-5 h-5" />Quiz da aula</Link>
            )}
          </div>

          {lesson.content && <div className="prose-lite rounded-2xl bg-slate-50 p-5 text-[16px]">{lesson.content}</div>}

          <div className="flex justify-between gap-3">
            {prev ? <Link href={`/cursos/${slug}/aula/${prev.id}`} className="btn btn-light btn-sm">‹ Anterior</Link> : <span />}
            {next && <Link href={`/cursos/${slug}/aula/${next.id}`} className="btn btn-light btn-sm">Próxima ›</Link>}
          </div>
        </div>
      </div>

      <aside className="mt-8 lg:mt-0 rounded-t-[28px] lg:rounded-3xl border-t lg:border border-slate-200 bg-white px-4 sm:px-6 pt-3 pb-6 lg:h-fit lg:sticky lg:top-24">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 lg:hidden" />
        <h2 className="text-xl font-bold text-navy-950">{course.title}</h2>
        <div className="mt-4 flex items-center gap-4">
          <ProgressBar pct={pct} className="flex-1" />
          <span className="font-semibold text-slate-600 tabular-nums">{pct}%</span>
        </div>
        <p className="mt-2 text-slate-500">{doneCount} de {ordered.length} aulas concluídas</p>
        <div className="mt-5 space-y-5 lg:max-h-[55vh] lg:overflow-auto lg:pr-1">
          {mods.map((m) => (
            <div key={m.id}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{m.title}</p>
              <div className="space-y-2">
                {ordered.filter((l) => l.module_id === m.id).map((l) => {
                  const current = l.id === lesson.id;
                  const n = ordered.indexOf(l) + 1;
                  return (
                    <Link key={l.id} href={`/cursos/${slug}/aula/${l.id}`} className={`flex items-center gap-3 rounded-2xl border p-2.5 transition ${current ? "border-navy-900 bg-navy-50" : "border-slate-200 hover:bg-slate-50"}`}>
                      <span className={`grid h-14 w-20 shrink-0 place-items-center rounded-xl text-sm font-bold ${done.has(l.id) ? "bg-emerald-600 text-white" : current ? "bg-navy-950 text-white" : "bg-navy-900/90 text-white/80"}`}>
                        {done.has(l.id) ? <IconCheck className="w-6 h-6" /> : current ? <IconPlay className="w-6 h-6" /> : n}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block leading-snug line-clamp-2 ${current ? "font-bold text-navy-950" : "text-navy-900"}`}>{l.title}</span>
                        {l.duration_minutes ? <span className="text-sm text-slate-500">{l.duration_minutes} min</span> : null}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          {exam && (
            <Link href={`/cursos/${slug}/avaliacao/${exam.id}`} className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 p-3 hover:bg-slate-50">
              <span className="grid h-14 w-20 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-600"><IconQuiz className="w-6 h-6" /></span>
              <span><span className="block font-semibold text-navy-950">{exam.title}</span><span className="text-sm text-slate-500">Prova final · nota mínima {exam.passing_score}%</span></span>
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}
