import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import type { Course } from "@/lib/types";
import { CourseForm } from "./CourseForm";

export default async function AdminCourses() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("courses").select("*, enrollments(count), lessons(count)").order("position").order("created_at");
  const courses = (data ?? []) as (Course & { enrollments: { count: number }[]; lessons: { count: number }[] })[];
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_420px]">
      <section>
        <h1 className="h-section mb-4">Cursos</h1>
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Curso</th><th>Tipo</th><th>Aulas</th><th>Alunos</th><th>Status</th></tr></thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/admin/cursos/${c.id}`} className="link">{c.title}</Link></td>
                  <td>{c.access_type === "free" ? <span className="badge bg-emerald-100 text-emerald-800">Gratuito</span> : <span className="badge bg-brand-100 text-brand-700">Pago</span>}</td>
                  <td>{c.lessons[0]?.count ?? 0}</td>
                  <td>{c.enrollments[0]?.count ?? 0}</td>
                  <td>{c.is_published ? "Publicado" : <span className="text-muted">Rascunho</span>}</td>
                </tr>
              ))}
              {!courses.length && <tr><td colSpan={5} className="text-muted text-center py-6">Nenhum curso ainda. Crie o primeiro ao lado.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2 className="h-section mb-4">Novo curso</h2>
        <CourseForm />
      </section>
    </div>
  );
}
