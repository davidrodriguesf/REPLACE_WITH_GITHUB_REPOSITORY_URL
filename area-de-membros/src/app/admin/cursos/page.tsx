import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import type { Course } from "@/lib/types";
import { CourseForm } from "./CourseForm";
import { setLicenseAudience } from "../marketplace-actions";

type Row = Course & { lessons: { count: number }[]; quizzes: { count: number }[]; certificates: { count: number }[] };

export default async function CursosAdmin() {
  const { supabase, profile } = await requireAdmin();
  const [{ data }, { data: cats }, { data: roles }, { data: inst }, { data: lic }] = await Promise.all([
    supabase.from("courses").select("*, lessons(count), quizzes(count), certificates(count)").order("position").order("created_at"),
    supabase.from("categories").select("id, name").eq("company_id", profile.company_id).order("position"),
    supabase.from("job_roles").select("id, name").order("name"),
    supabase.from("instructors").select("id, name").eq("company_id", profile.company_id).order("name"),
    supabase.from("course_licenses").select("course_id, audience").eq("company_id", profile.company_id),
  ]);
  const all = (data ?? []) as Row[];
  const own = all.filter((c) => !c.is_marketplace && c.company_id === profile.company_id);
  const licAudience = new Map((lic ?? []).map((l) => [l.course_id as string, l.audience as string]));
  const bought = all.filter((c) => c.is_marketplace && licAudience.has(c.id));
  const catName = new Map((cats ?? []).map((c) => [c.id as string, c.name as string]));
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_460px]">
      <section className="min-w-0 space-y-8">
        <div>
          <h1 className="h-row mb-4">Cursos da empresa</h1>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="table min-w-[640px]">
              <thead><tr><th>Curso</th><th>Aulas</th><th>Avaliações</th><th>Certificados</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {own.map((c) => (
                  <tr key={c.id}>
                    <td><Link href={`/admin/cursos/${c.id}`} className="font-semibold text-navy-950 hover:underline">{c.title}</Link><p className="text-xs text-slate-500">{(c.category_id && catName.get(c.category_id)) || "Sem categoria"} · {c.audience === "all" ? "Todos" : "Funções específicas"}</p></td>
                    <td>{c.lessons[0]?.count ?? 0}</td>
                    <td>{c.quizzes[0]?.count ?? 0}</td>
                    <td>{c.certificates[0]?.count ?? 0}</td>
                    <td>{c.is_published ? <span className="text-emerald-700 font-semibold">Publicado</span> : <span className="text-slate-400">Rascunho</span>}</td>
                    <td><Link href={`/admin/cursos/${c.id}`} className="btn btn-secondary btn-sm">Editar</Link></td>
                  </tr>
                ))}
                {!own.length && <tr><td colSpan={6} className="py-6 text-center text-slate-500">Nenhum curso ainda.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="h-section">Comprados no marketplace</h2>
              <p className="text-sm text-slate-500">Cursos prontos do PestX. Coloque-os nas trilhas ou libere para todos.</p>
            </div>
            <Link href="/admin/loja" className="btn btn-primary btn-sm">Ver marketplace</Link>
          </div>
          {bought.length ? (
            <ul className="space-y-2">
              {bought.map((c) => (
                <li key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <Link href={`/cursos/${c.slug}`} className="font-semibold text-navy-950 hover:underline">{c.title}</Link>
                    <p className="text-xs text-slate-500">{c.lessons[0]?.count ?? 0} aulas · {c.certificates[0]?.count ?? 0} certificados</p>
                  </div>
                  <form action={setLicenseAudience} className="flex items-center gap-2">
                    <input type="hidden" name="course_id" value={c.id} />
                    <select name="audience" defaultValue={licAudience.get(c.id)} className="input !w-auto !py-1.5 text-sm">
                      <option value="all">Todos os colaboradores</option>
                      <option value="trail">Só por trilha ou atribuição</option>
                    </select>
                    <button className="btn btn-secondary btn-sm">Salvar</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Nenhum curso comprado ainda.</p>
          )}
        </div>
      </section>
      <section>
        <h2 className="h-section mb-3">Novo curso</h2>
        <CourseForm categories={(cats ?? []) as { id: string; name: string }[]} roles={(roles ?? []) as { id: string; name: string }[]} instructors={(inst ?? []) as { id: string; name: string }[]} />
      </section>
    </div>
  );
}
