import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { addTrailCourse, deleteTrail, removeTrailCourse, updateTrailCourse } from "../../actions";
import { ConfirmButton, SubmitButton } from "@/components/ui";
import { IconChevronLeft } from "@/components/Icons";
import type { Trail } from "@/lib/types";
import { TrailForm } from "../TrailForm";

export default async function TrilhaAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: trail } = await supabase.from("trails").select("*").eq("id", id).maybeSingle<Trail>();
  if (!trail) notFound();
  const [{ data: roles }, { data: tr }, { data: tc }, { data: courses }] = await Promise.all([
    supabase.from("job_roles").select("id, name").order("name"),
    supabase.from("trail_job_roles").select("job_role_id").eq("trail_id", id),
    supabase.from("trail_courses").select("course_id, position, required, courses(title, is_published)").eq("trail_id", id).order("position"),
    supabase.from("courses").select("id, title").order("title"),
  ]);
  const steps = (tc ?? []) as unknown as { course_id: string; position: number; required: boolean; courses: { title: string; is_published: boolean } | null }[];
  const inTrail = new Set(steps.map((s) => s.course_id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/trilhas" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-navy-900"><IconChevronLeft className="w-4 h-4" />Trilhas</Link>
        <form action={deleteTrail}>
          <input type="hidden" name="id" value={trail.id} />
          <ConfirmButton message="Excluir esta trilha? Os cursos continuam existindo.">Excluir trilha</ConfirmButton>
        </form>
      </div>
      <h1 className="h-page">{trail.title}</h1>
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <TrailForm trail={trail} roles={(roles ?? []) as { id: string; name: string }[]} selected={(tr ?? []).map((x) => x.job_role_id as string)} />
        <section className="space-y-3">
          <h2 className="h-section">Cursos da trilha (em ordem)</h2>
          {steps.map((s, i) => (
            <div key={s.course_id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 p-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
              <span className="min-w-0 flex-1 font-semibold text-navy-950">
                {s.courses?.title}
                {s.courses && !s.courses.is_published && <span className="ml-2 text-xs font-bold text-amber-700">rascunho</span>}
              </span>
              <form action={updateTrailCourse} className="flex items-center gap-2">
                <input type="hidden" name="trail_id" value={trail.id} />
                <input type="hidden" name="course_id" value={s.course_id} />
                <input className="input !w-20 !py-2" name="position" type="number" defaultValue={s.position} aria-label="Ordem" />
                <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="required" defaultChecked={s.required} />Obrigatório</label>
                <SubmitButton variant="secondary" className="btn-sm" pendingText="...">Salvar</SubmitButton>
              </form>
              <form action={removeTrailCourse}>
                <input type="hidden" name="trail_id" value={trail.id} />
                <input type="hidden" name="course_id" value={s.course_id} />
                <ConfirmButton message="Tirar este curso da trilha?" variant="ghost" className="btn-sm">Remover</ConfirmButton>
              </form>
            </div>
          ))}
          {!steps.length && <p className="rounded-2xl bg-slate-50 p-4 text-slate-500">Nenhum curso na trilha.</p>}
          <form action={addTrailCourse} className="flex flex-wrap gap-2 rounded-2xl border border-dashed border-slate-300 p-3">
            <input type="hidden" name="trail_id" value={trail.id} />
            <input type="hidden" name="position" value={steps.length} />
            <select name="course_id" className="input flex-1 min-w-[200px]" defaultValue="" required>
              <option value="" disabled>Adicionar curso...</option>
              {(courses ?? []).filter((c) => !inTrail.has(c.id)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <SubmitButton pendingText="...">Adicionar</SubmitButton>
          </form>
        </section>
      </div>
    </div>
  );
}
