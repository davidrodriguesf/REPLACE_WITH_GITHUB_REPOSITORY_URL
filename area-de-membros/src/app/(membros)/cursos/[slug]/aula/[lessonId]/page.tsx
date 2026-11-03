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
    supabase.from("lessons").select("id, module_id, title, position").eq("course_id", course.id).order("position"),
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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5 min-w-0">
        <Link href={`/cursos/${slug}`} className="link text-sm">← {course.title}</Link>
        {embed && (
          <div className="aspect-video rounded-2xl overflow-hidden bg-black">
            <iframe src={embed} className="w-full h-full" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen title={lesson.title} />
          </div>
        )}
        <div className="card p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{lesson.title}</h1>
              {lesson.description && <p className="text-muted mt-1">{lesson.description}</p>}
            </div>
            <form action={toggleLessonComplete}>
              <input type="hidden" name="lesson_id" value={lesson.id} />
              <input type="hidden" name="done" value={isDone ? "1" : "0"} />
              <input type="hidden" name="next_url" value={next ? `/cursos/${slug}/aula/${next.id}` : ""} />
              <SubmitButton variant={isDone ? "secondary" : "primary"} pendingText="...">
                <IconCheck className="w-4 h-4" /> {isDone ? "Concluída" : "Marcar como concluída"}
              </SubmitButton>
            </form>
          </div>
          {lesson.content && <div className="prose-lite border-t border-slate-100 pt-4">{lesson.content}</div>}
          {lesson.attachment_url && (
            <a href={lesson.attachment_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              <IconDownload className="w-4 h-4" /> Material complementar
            </a>
          )}
          <div className="flex justify-between gap-3 border-t border-slate-100 pt-4">
            {prev ? <Link href={`/cursos/${slug}/aula/${prev.id}`} className="btn btn-secondary">← Anterior</Link> : <span />}
            {next && <Link href={`/cursos/${slug}/aula/${next.id}`} className="btn btn-secondary">Próxima →</Link>}
          </div>
        </div>
      </div>

      <aside className="card p-2 h-fit lg:sticky lg:top-20 max-h-[80vh] overflow-auto">
        {mods.map((m) => (
          <div key={m.id} className="py-1">
            <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted">{m.title}</p>
            {ordered.filter((l) => l.module_id === m.id).map((l) => (
              <Link
                key={l.id}
                href={`/cursos/${slug}/aula/${l.id}`}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${l.id === lesson.id ? "bg-brand-50 text-brand-700 font-semibold" : "hover:bg-slate-50"}`}
              >
                {done.has(l.id) ? <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" /> : <IconPlay className="w-4 h-4 text-slate-400 shrink-0" />}
                {l.title}
              </Link>
            ))}
          </div>
        ))}
      </aside>
    </div>
  );
}
