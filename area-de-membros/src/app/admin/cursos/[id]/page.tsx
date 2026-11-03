import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createExam, deleteCourse, deleteModule, saveModule } from "../../actions";
import { ConfirmButton, SubmitButton } from "@/components/ui";
import { IconChevronLeft, IconQuiz } from "@/components/Icons";
import type { Course, Lesson, Module, Quiz } from "@/lib/types";
import { CourseForm } from "../CourseForm";
import { QuickQuizForm } from "./QuickQuizForm";

export default async function CursoAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: course } = await supabase.from("courses").select("*").eq("id", id).maybeSingle<Course>();
  if (!course) notFound();
  const [{ data: m }, { data: l }, { data: q }, { data: cats }, { data: roles }, { data: inst }, { data: cr }, { data: ci }] = await Promise.all([
    supabase.from("modules").select("*").eq("course_id", id).order("position").order("created_at"),
    supabase.from("lessons").select("*").eq("course_id", id).order("position").order("created_at"),
    supabase.from("quizzes").select("*, quiz_questions(count)").eq("course_id", id).order("created_at"),
    supabase.from("categories").select("id, name").order("position"),
    supabase.from("job_roles").select("id, name").order("name"),
    supabase.from("instructors").select("id, name").order("name"),
    supabase.from("course_job_roles").select("job_role_id").eq("course_id", id),
    supabase.from("course_instructors").select("instructor_id").eq("course_id", id).order("position"),
  ]);
  const modules = (m ?? []) as Module[];
  const lessons = (l ?? []) as Lesson[];
  const quizzes = (q ?? []) as (Quiz & { quiz_questions: { count: number }[] })[];
  const exam = quizzes.find((x) => x.kind === "exam" && !x.lesson_id);
  const lessonTitle = new Map(lessons.map((x) => [x.id, x.title]));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/cursos" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-navy-900"><IconChevronLeft className="w-4 h-4" />Cursos</Link>
          <h1 className="h-page mt-1">{course.title}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/cursos/${course.slug}`} className="btn btn-light">Ver como colaborador</Link>
          <form action={deleteCourse}>
            <input type="hidden" name="id" value={course.id} />
            <ConfirmButton message="Excluir o curso, aulas, provas, progresso e certificados? Não dá para desfazer.">Excluir</ConfirmButton>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <section>
          <h2 className="h-section mb-3">Dados do curso</h2>
          <CourseForm
            course={course}
            categories={(cats ?? []) as { id: string; name: string }[]}
            roles={(roles ?? []) as { id: string; name: string }[]}
            instructors={(inst ?? []) as { id: string; name: string }[]}
            selectedRoles={(cr ?? []).map((x) => x.job_role_id as string)}
            selectedInstructors={(ci ?? []).map((x) => x.instructor_id as string)}
          />
        </section>

        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="h-section">Avaliações</h2>
            {quizzes.map((x) => (
              <Link key={x.id} href={`/admin/cursos/${course.id}/avaliacoes/${x.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 hover:shadow-md">
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${x.kind === "exam" ? "bg-gold-100 text-gold-600" : "bg-navy-50 text-navy-800"}`}><IconQuiz /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-navy-950">{x.title}{!x.is_published && <span className="ml-2 text-xs text-amber-700">rascunho</span>}</span>
                  <span className="text-sm text-slate-500">
                    {x.kind === "exam" ? "Prova final" : `Quiz · ${x.lesson_id ? lessonTitle.get(x.lesson_id) : "curso"}`} · {x.quiz_questions[0]?.count ?? 0} questões · mínimo {x.passing_score}%
                  </span>
                </span>
              </Link>
            ))}
            {!exam && (
              <form action={createExam} className="rounded-2xl border border-dashed border-slate-300 p-4 flex flex-wrap items-center gap-3">
                <input type="hidden" name="course_id" value={course.id} />
                <p className="flex-1 text-sm text-slate-600">Sem prova final. Com prova, o certificado só sai para quem for aprovado.</p>
                <SubmitButton pendingText="Criando...">Criar prova final</SubmitButton>
              </form>
            )}
            {lessons.length > 0 && <QuickQuizForm courseId={course.id} lessons={lessons.map((x) => ({ id: x.id, title: x.title }))} />}
          </section>

          <section className="space-y-4">
            <h2 className="h-section">Módulos e aulas</h2>
            {modules.map((mod) => (
              <div key={mod.id} className="card p-4 space-y-3">
                <form action={saveModule} className="flex gap-2">
                  <input type="hidden" name="id" value={mod.id} />
                  <input type="hidden" name="course_id" value={course.id} />
                  <input className="input !w-20" name="position" type="number" defaultValue={mod.position} aria-label="Ordem" />
                  <input className="input flex-1 font-semibold" name="title" defaultValue={mod.title} aria-label="Título do módulo" />
                  <SubmitButton variant="secondary" pendingText="...">Salvar</SubmitButton>
                </form>
                <ul className="divide-y divide-slate-100">
                  {lessons.filter((x) => x.module_id === mod.id).map((x) => (
                    <li key={x.id} className="flex items-center gap-2 py-2 text-sm">
                      <span className="w-6 text-slate-400">{x.position}</span>
                      <Link href={`/admin/cursos/${course.id}/aulas/${x.id}`} className="link flex-1">{x.title}</Link>
                      {!x.video_url && <span className="badge !px-2 !py-0.5 !text-xs bg-amber-50 text-amber-700">sem vídeo</span>}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/admin/cursos/${course.id}/aulas/nova?modulo=${mod.id}`} className="btn btn-primary btn-sm">+ Aula</Link>
                  <form action={deleteModule}>
                    <input type="hidden" name="id" value={mod.id} />
                    <ConfirmButton message="Excluir o módulo e todas as suas aulas?" variant="ghost" className="btn-sm">Excluir módulo</ConfirmButton>
                  </form>
                </div>
              </div>
            ))}
            <form action={saveModule} className="card p-4 flex gap-2">
              <input type="hidden" name="course_id" value={course.id} />
              <input type="hidden" name="position" value={modules.length} />
              <input className="input flex-1" name="title" placeholder="Nome do novo módulo" required />
              <SubmitButton pendingText="...">+ Módulo</SubmitButton>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
