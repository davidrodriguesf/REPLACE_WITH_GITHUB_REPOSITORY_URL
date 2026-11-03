import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import type { Course } from "@/lib/types";
import { CourseForm } from "./CourseForm";

export default async function CursosAdmin() {
  const { supabase } = await requireAdmin();
  const [{ data }, { data: cats }, { data: roles }, { data: inst }] = await Promise.all([
    supabase.from("courses").select("*, lessons(count), quizzes(count), certificates(count)").order("position").order("created_at"),
    supabase.from("categories").select("id, name").order("position"),
    supabase.from("job_roles").select("id, name").order("name"),
    supabase.from("instructors").select("id, name").order("name"),
  ]);
  const courses = (data ?? []) as (Course & { lessons: { count: number }[]; quizzes: { count: number }[]; certificates: { count: number }[] })[];
  const catName = new Map((cats ?? []).map((c) => [c.id as string, c.name as string]));
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_460px]">
      <section className="min-w-0">
        <h1 className="h-row mb-4">Cursos</h1>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="table min-w-[600px]">
            <thead><tr><th>Curso</th><th>Aulas</th><th>Avaliações</th><th>Certificados</th><th>Status</th></tr></thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/admin/cursos/${c.id}`} className="font-semibold text-navy-950 hover:underline">{c.title}</Link><p className="text-xs text-slate-500">{(c.category_id && catName.get(c.category_id)) || "Sem categoria"} · {c.audience === "all" ? "Todos" : "Funções específicas"}</p></td>
                  <td>{c.lessons[0]?.count ?? 0}</td>
                  <td>{c.quizzes[0]?.count ?? 0}</td>
                  <td>{c.certificates[0]?.count ?? 0}</td>
                  <td>{c.is_published ? <span className="text-emerald-700 font-semibold">Publicado</span> : <span className="text-slate-400">Rascunho</span>}</td>
                </tr>
              ))}
              {!courses.length && <tr><td colSpan={5} className="py-6 text-center text-slate-500">Nenhum curso ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2 className="h-section mb-3">Novo curso</h2>
        <CourseForm categories={(cats ?? []) as { id: string; name: string }[]} roles={(roles ?? []) as { id: string; name: string }[]} instructors={(inst ?? []) as { id: string; name: string }[]} />
      </section>
    </div>
  );
}
