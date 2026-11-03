import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { deleteCourse, deleteModule, saveModule } from "../../actions";
import { ConfirmButton, SubmitButton } from "@/components/ui";
import type { Course, Lesson, Module } from "@/lib/types";
import { CourseForm } from "../CourseForm";
import { LessonForm } from "../LessonForm";

export default async function AdminCourse({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: course } = await supabase.from("courses").select("*").eq("id", id).maybeSingle<Course>();
  if (!course) notFound();
  const [{ data: m }, { data: l }] = await Promise.all([
    supabase.from("modules").select("*").eq("course_id", id).order("position").order("created_at"),
    supabase.from("lessons").select("*").eq("course_id", id).order("position").order("created_at"),
  ]);
  const modules = (m ?? []) as Module[];
  const lessons = (l ?? []) as Lesson[];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/cursos" className="link text-sm">← Cursos</Link>
          <h1 className="h-page mt-1">{course.title}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/cursos/${course.slug}`} className="btn btn-secondary">Ver como aluno</Link>
          <form action={deleteCourse}>
            <input type="hidden" name="id" value={course.id} />
            <ConfirmButton message="Excluir o curso, módulos, aulas e acessos? Isso não pode ser desfeito.">Excluir</ConfirmButton>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <section>
          <h2 className="h-section mb-3">Dados do curso</h2>
          <CourseForm course={course} />
        </section>

        <section className="space-y-4">
          <h2 className="h-section">Módulos e aulas</h2>
          {modules.map((mod) => (
            <div key={mod.id} className="card p-4 space-y-3">
              <form action={saveModule} className="flex gap-2">
                <input type="hidden" name="id" value={mod.id} />
                <input type="hidden" name="course_id" value={course.id} />
                <input className="input w-20" name="position" type="number" defaultValue={mod.position} aria-label="Ordem" />
                <input className="input flex-1 font-semibold" name="title" defaultValue={mod.title} aria-label="Título do módulo" />
                <SubmitButton variant="secondary" pendingText="...">Salvar</SubmitButton>
              </form>
              <ul className="divide-y divide-slate-100">
                {lessons.filter((x) => x.module_id === mod.id).map((x) => (
                  <li key={x.id} className="flex items-center gap-2 py-2 text-sm">
                    <span className="text-muted w-6">{x.position}</span>
                    <Link href={`/admin/cursos/${course.id}/aulas/${x.id}`} className="link flex-1">{x.title}</Link>
                    {!x.video_url && <span className="badge bg-amber-100 text-amber-800">sem vídeo</span>}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/cursos/${course.id}/aulas/nova?modulo=${mod.id}`} className="btn btn-primary btn-sm">+ Aula</Link>
                <form action={deleteModule}>
                  <input type="hidden" name="id" value={mod.id} />
                  <input type="hidden" name="course_id" value={course.id} />
                  <ConfirmButton message="Excluir o módulo e todas as suas aulas?" className="btn-sm">Excluir módulo</ConfirmButton>
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
          {modules.length > 0 && lessons.length === 0 && (
            <div className="card p-4">
              <p className="font-semibold mb-3">Adicionar primeira aula</p>
              <LessonForm courseId={course.id} modules={modules} moduleId={modules[0]!.id} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
