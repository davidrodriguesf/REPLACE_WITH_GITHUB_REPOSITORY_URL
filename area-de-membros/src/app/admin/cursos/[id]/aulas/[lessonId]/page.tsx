import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { deleteLesson } from "../../../../actions";
import { ConfirmButton } from "@/components/ui";
import type { Course, Lesson, Module } from "@/lib/types";
import { LessonForm } from "../../../LessonForm";

export default async function AdminLesson({ params, searchParams }: { params: Promise<{ id: string; lessonId: string }>; searchParams: Promise<{ modulo?: string }> }) {
  const { id, lessonId } = await params;
  const { modulo } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: course } = await supabase.from("courses").select("*").eq("id", id).maybeSingle<Course>();
  if (!course) notFound();
  const { data: modules } = await supabase.from("modules").select("*").eq("course_id", id).order("position");
  const isNew = lessonId === "nova";
  let lesson: Lesson | undefined;
  if (!isNew) {
    const { data } = await supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle<Lesson>();
    if (!data) notFound();
    lesson = data;
  }
  if (!modules?.length) notFound();

  return (
    <div className="max-w-3xl space-y-4">
      <Link href={`/admin/cursos/${id}`} className="link text-sm">← {course.title}</Link>
      <div className="flex items-center justify-between gap-3">
        <h1 className="h-page">{isNew ? "Nova aula" : "Editar aula"}</h1>
        {lesson && (
          <form action={deleteLesson}>
            <input type="hidden" name="id" value={lesson.id} />
            <input type="hidden" name="course_id" value={id} />
            <ConfirmButton message="Excluir esta aula?">Excluir</ConfirmButton>
          </form>
        )}
      </div>
      <div className="card p-5">
        <LessonForm courseId={id} modules={modules as Module[]} lesson={lesson} moduleId={modulo} />
      </div>
    </div>
  );
}
