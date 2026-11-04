import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getLearning, formatMinutes } from "@/lib/learning";
import { Cover } from "@/components/Cards";
import { Sheet } from "@/components/Sheet";
import { Avatar } from "@/components/Avatar";
import { IconAward, IconBook, IconCheck, IconChevronDown, IconClock, IconPlay, IconQuiz } from "@/components/Icons";
import { formatDate } from "@/lib/utils";
import type { Lesson, Module, Quiz } from "@/lib/types";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, user } = await requireUser();
  const { courses } = await getLearning(supabase, user.id);
  const course = courses.find((c) => c.slug === slug);
  if (!course) notFound();

  const [{ data: modules }, { data: lessons }, { data: quizzes }, { data: attempts }, { data: inTrail }] = await Promise.all([
    supabase.from("modules").select("*").eq("course_id", course.id).order("position"),
    supabase.from("lessons").select("id, module_id, title, position").eq("course_id", course.id).order("position"),
    supabase.from("quizzes").select("*").eq("course_id", course.id).eq("kind", "exam").eq("is_published", true),
    supabase.from("quiz_attempts").select("quiz_id, score, passed").eq("user_id", user.id),
    supabase.from("trail_courses").select("trail_id").eq("course_id", course.id).limit(1),
  ]);
  const mods = (modules ?? []) as Module[];
  const ls = (lessons ?? []) as Lesson[];
  const exam = (quizzes ?? [])[0] as Quiz | undefined;
  const myExam = (attempts ?? []).filter((a) => exam && a.quiz_id === exam.id);
  const best = myExam.reduce((m, a) => Math.max(m, a.score as number), -1);
  const passed = myExam.some((a) => a.passed);
  const attemptsLeft = exam?.max_attempts != null ? Math.max(0, exam.max_attempts - myExam.length) : null;
  const allLessonsDone = course.completed;
  const continueHref = course.nextLesson ? `/cursos/${course.slug}/aula/${course.nextLesson.id}` : null;

  const ctaLabel = !course.started ? "Acessar" : allLessonsDone ? "Rever aulas" : "Continuar";
  const footer = (
    <div className="flex gap-3">
      {continueHref ? (
        <Link href={continueHref} className="btn btn-primary btn-lg flex-1">{ctaLabel}</Link>
      ) : (
        <span className="btn btn-secondary btn-lg flex-1 cursor-default">Aulas em breve</span>
      )}
      {exam && allLessonsDone && !passed && (attemptsLeft === null || attemptsLeft > 0) && (
        <Link href={`/cursos/${course.slug}/avaliacao/${exam.id}`} className="btn btn-light btn-lg">Fazer prova</Link>
      )}
    </div>
  );

  return (
    <Sheet backHref="/catalogo" footer={footer}>
      <div className="space-y-7">
        <Cover title={course.title} subtitle={course.instructors.map((i) => i.name).join(" · ")} url={course.cover_url} />
        <div className="space-y-3">
          <h1 className="text-[28px] sm:text-3xl font-bold leading-tight text-navy-950">{course.title}</h1>
          <div className="flex flex-wrap gap-2">
            {course.completed && <span className="badge bg-emerald-50 text-emerald-700"><IconCheck className="w-4 h-4" />Concluído</span>}
            {!course.completed && course.started && <span className="badge bg-emerald-50 text-emerald-700"><IconCheck className="w-4 h-4" />Inscrito · {course.pct}%</span>}
            {!!inTrail?.length && <span className="badge bg-brand-50 text-navy-800">Na sua trilha</span>}
            {course.dueDate && !course.completed && <span className="badge bg-brand-100 text-brand-700">Obrigatório até {formatDate(course.dueDate)}</span>}
            {course.categoryName && <span className="badge bg-slate-100 text-slate-600">{course.categoryName}</span>}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-3 border-b border-slate-200 pb-6">
          <span className="flex items-center gap-3 text-[17px] text-slate-600"><span className="icon-box"><IconBook /></span>{course.moduleCount} módulo{course.moduleCount === 1 ? "" : "s"}</span>
          <span className="flex items-center gap-3 text-[17px] text-slate-600"><span className="icon-box"><IconPlay /></span>{course.totalLessons} aulas</span>
          {(course.workload_hours || course.totalMinutes > 0) && (
            <span className="flex items-center gap-3 text-[17px] text-slate-600"><span className="icon-box"><IconClock /></span>{course.workload_hours ? `${course.workload_hours}h` : formatMinutes(course.totalMinutes)}</span>
          )}
        </div>

        {course.description && (
          <section>
            <h2 className="h-section mb-3">Sobre o Curso</h2>
            <details className="group">
              <summary className="list-none cursor-pointer">
                <p className="text-[17px] leading-relaxed text-slate-600 line-clamp-3 group-open:line-clamp-none whitespace-pre-wrap">{course.description}</p>
                <span className="mt-4 flex items-center justify-center gap-2 font-semibold text-navy-900">
                  <span className="group-open:hidden">Ver mais</span><span className="hidden group-open:inline">Ver menos</span>
                  <IconChevronDown className="w-5 h-5 transition group-open:rotate-180" />
                </span>
              </summary>
            </details>
          </section>
        )}

        <section>
          <h2 className="h-section mb-2">Conteúdos do Curso</h2>
          <ol>
            {mods.map((m, i) => {
              const ml = ls.filter((l) => l.module_id === m.id);
              const first = ml[0];
              return (
                <li key={m.id}>
                  <Link href={first ? `/cursos/${course.slug}/aula/${first.id}` : "#"} className="flex items-center gap-4 border-b border-slate-200 py-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-600 font-bold text-white">{i + 1}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[17px] font-medium text-navy-950 truncate">{m.title}</span>
                      <span className="block text-slate-500">{ml.length} aula{ml.length === 1 ? "" : "s"}</span>
                    </span>
                    <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-brand-600 text-navy-950"><IconPlay className="w-5 h-5" /></span>
                  </Link>
                </li>
              );
            })}
            {!mods.length && <li className="py-4 text-slate-500">Conteúdo em breve.</li>}
          </ol>
        </section>

        {(exam || course.certificate_enabled) && (
          <section className="grid gap-3 sm:grid-cols-2">
            {exam && (
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="flex items-center gap-2 font-bold text-navy-950"><IconQuiz className="w-5 h-5" /> Prova final</p>
                <p className="mt-1 text-sm text-slate-500">
                  Nota mínima {exam.passing_score}%{exam.max_attempts ? ` · ${exam.max_attempts} tentativa${exam.max_attempts === 1 ? "" : "s"}` : ""}{exam.time_limit_minutes ? ` · ${exam.time_limit_minutes} min` : ""}
                </p>
                <p className="mt-3 text-sm font-semibold">
                  {passed ? <span className="text-emerald-700">Aprovado · melhor nota {best}%</span>
                    : best >= 0 ? <span className="text-amber-700">Melhor nota {best}%{attemptsLeft !== null ? ` · ${attemptsLeft} tentativa(s) restante(s)` : ""}</span>
                    : allLessonsDone ? <span className="text-navy-800">Liberada: conclua a prova para receber o certificado</span>
                    : <span className="text-slate-500">Liberada ao concluir todas as aulas</span>}
                </p>
              </div>
            )}
            {course.certificate_enabled && (
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="flex items-center gap-2 font-bold text-navy-950"><IconAward className="w-5 h-5" /> Certificado</p>
                {course.certificateId ? (
                  <Link href={`/certificados/${course.certificateId}`} className="link mt-2 inline-block">Ver meu certificado</Link>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">Emitido ao concluir todas as aulas{exam ? " e ser aprovado(a) na prova" : ""}.</p>
                )}
              </div>
            )}
          </section>
        )}

        {course.instructors.length > 0 && (
          <section>
            <h2 className="h-section mb-3">{course.instructors.length > 1 ? "Mentores" : "Mentor"}</h2>
            <ul className="space-y-4">
              {course.instructors.map((i) => (
                <li key={i.id} className="flex items-center gap-4">
                  <Avatar name={i.name} url={i.avatar_url} size={64} />
                  <div>
                    <p className="text-[17px] font-medium text-navy-950">{i.name}</p>
                    {i.title && <p className="text-sm text-slate-500">{i.title}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Sheet>
  );
}
