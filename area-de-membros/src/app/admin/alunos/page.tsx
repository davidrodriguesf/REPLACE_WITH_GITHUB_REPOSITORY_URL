import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { GrantForm } from "./GrantForm";

type Row = Profile & { enrollments: { course_id: string }[] };

export default async function AdminStudents({ searchParams }: { searchParams: Promise<{ q?: string; curso?: string }> }) {
  const { q = "", curso = "" } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: courses } = await supabase.from("courses").select("id, title, access_type").order("position");

  let query = supabase
    .from("profiles")
    .select(curso ? "*, enrollments!enrollments_user_id_fkey!inner(course_id)" : "*, enrollments!enrollments_user_id_fkey(course_id)")
    .order("created_at", { ascending: false })
    .limit(100);
  const term = q.replace(/[%,()]/g, "").trim();
  if (term) query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
  if (curso) query = query.eq("enrollments.course_id", curso);
  const { data } = await query;
  const rows = (data ?? []) as unknown as Row[];
  const titles = new Map((courses ?? []).map((c) => [c.id as string, c.title as string]));

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_440px]">
      <section className="space-y-4 min-w-0">
        <h1 className="h-section">Alunos</h1>
        <form className="flex flex-col sm:flex-row gap-2">
          <input className="input" name="q" defaultValue={q} placeholder="Buscar por nome ou e-mail" />
          <select className="input sm:w-56" name="curso" defaultValue={curso}>
            <option value="">Todos os cursos</option>
            {(courses ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button className="btn btn-secondary">Filtrar</button>
        </form>
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Aluno</th><th>Cursos</th><th>Desde</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/alunos/${p.id}`} className="link">{p.full_name || p.email}</Link>
                    {p.role === "admin" && <span className="badge bg-brand-100 text-brand-700 ml-2">Admin</span>}
                    <p className="text-xs text-muted">{p.email}</p>
                  </td>
                  <td className="text-xs">{p.enrollments.map((e) => titles.get(e.course_id)).filter(Boolean).join(", ") || <span className="text-muted">—</span>}</td>
                  <td className="text-xs text-muted whitespace-nowrap">{formatDate(p.created_at)}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={3} className="text-center text-muted py-6">Nenhum aluno encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <GrantForm courses={(courses ?? []) as { id: string; title: string; access_type: "paid" | "free" }[]} />
      </section>
    </div>
  );
}
