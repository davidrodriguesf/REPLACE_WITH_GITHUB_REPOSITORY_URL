import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMembersMap } from "@/lib/members";
import { goalStatusLabel, planStatusLabel } from "@/lib/development";
import { setGoalStatus } from "@/app/(app)/actions";
import { addGoal, deleteGoal, deletePlan, updatePlan } from "@/app/(app)/equipe/actions";
import { Avatar } from "@/components/Avatar";
import { ProgressBar } from "@/components/Cards";
import { ConfirmButton, SubmitButton } from "@/components/ui";
import { IconCheck, IconChevronLeft } from "@/components/Icons";
import { formatDate, timeAgo } from "@/lib/utils";
import type { Goal, Plan } from "@/lib/types";
import { NoteForm } from "./NoteForm";

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await requireUser();
  const { data: plan } = await supabase.from("development_plans").select("*").eq("id", id).maybeSingle<Plan>();
  if (!plan) notFound();
  const [{ data: goals }, { data: notes }, { data: owner }, { data: courses }] = await Promise.all([
    supabase.from("plan_goals").select("*, courses(title, slug)").eq("plan_id", id).order("position"),
    supabase.from("plan_notes").select("*").eq("plan_id", id).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, manager_id").eq("id", plan.user_id).maybeSingle(),
    supabase.from("courses").select("id, title").eq("is_published", true).order("title"),
  ]);
  const gl = (goals ?? []) as (Goal & { courses: { title: string; slug: string } | null })[];
  const done = gl.filter((g) => g.status === "done").length;
  const pct = gl.length ? Math.round((done / gl.length) * 100) : 0;
  const isOwner = plan.user_id === user.id;
  const canManage = profile.role === "admin" || (profile.role === "manager" && owner?.manager_id === user.id);
  const members = await getMembersMap(supabase, (notes ?? []).map((n) => n.author_id as string));
  const back = isOwner ? "/desenvolvimento" : `/equipe/${plan.user_id}`;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href={back} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-navy-900"><IconChevronLeft className="w-4 h-4" />{isOwner ? "Meu desenvolvimento" : owner?.full_name}</Link>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${plan.status === "completed" ? "bg-emerald-50 text-emerald-700" : plan.status === "cancelled" ? "bg-slate-100 text-slate-500" : "bg-brand-50 text-navy-800"}`}>{planStatusLabel[plan.status]}</span>
          {plan.due_date && <span className="badge bg-slate-100 text-slate-600">Prazo {formatDate(plan.due_date)}</span>}
          {!isOwner && owner && <span className="badge bg-slate-100 text-slate-600">{owner.full_name}</span>}
        </div>
        <h1 className="h-page">{plan.title}</h1>
        {plan.description && <p className="prose-lite text-[17px]">{plan.description}</p>}
        <div className="flex items-center gap-4">
          <ProgressBar pct={pct} className="flex-1" />
          <span className="font-semibold tabular-nums text-slate-600">{pct}%</span>
        </div>
        <p className="text-slate-500">{done} de {gl.length} metas concluídas</p>
      </div>

      <section className="space-y-3">
        <h2 className="h-row">Metas</h2>
        {gl.map((g) => (
          <div key={g.id} className={`rounded-2xl border p-5 ${g.status === "done" ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200"}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${g.status === "done" ? "bg-emerald-600 text-white" : g.status === "doing" ? "bg-brand-600 text-white" : "border-2 border-slate-300"}`}>
                {g.status === "done" && <IconCheck className="w-4 h-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-[17px] font-semibold ${g.status === "done" ? "text-slate-500 line-through" : "text-navy-950"}`}>{g.title}</p>
                {g.description && <p className="mt-1 text-slate-600">{g.description}</p>}
                <p className="mt-1 text-sm text-slate-500">
                  {goalStatusLabel[g.status]}{g.due_date ? ` · até ${formatDate(g.due_date)}` : ""}{g.completed_at ? ` · concluída ${timeAgo(g.completed_at)}` : ""}
                </p>
                {g.courses && <Link href={`/cursos/${g.courses.slug}`} className="link mt-1 inline-block text-sm">Curso: {g.courses.title}</Link>}
              </div>
            </div>
            {(isOwner || canManage) && (
              <div className="mt-4 flex flex-wrap items-center gap-2 pl-10">
                {(["todo", "doing", "done"] as const).map((s) => (
                  <form key={s} action={setGoalStatus}>
                    <input type="hidden" name="goal_id" value={g.id} />
                    <input type="hidden" name="plan_id" value={plan.id} />
                    <input type="hidden" name="status" value={s} />
                    <button className={`rounded-full px-3.5 py-1.5 text-sm font-semibold cursor-pointer ${g.status === s ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{goalStatusLabel[s]}</button>
                  </form>
                ))}
                {canManage && (
                  <form action={deleteGoal} className="ml-auto">
                    <input type="hidden" name="goal_id" value={g.id} />
                    <input type="hidden" name="plan_id" value={plan.id} />
                    <ConfirmButton message="Excluir esta meta?" variant="ghost" className="btn-sm">Excluir</ConfirmButton>
                  </form>
                )}
              </div>
            )}
          </div>
        ))}
        {!gl.length && <p className="rounded-2xl bg-slate-50 p-5 text-slate-500">Nenhuma meta cadastrada.</p>}

        {canManage && (
          <form action={addGoal} className="rounded-2xl border border-dashed border-slate-300 p-5 space-y-3">
            <p className="font-bold text-navy-950">Nova meta</p>
            <input type="hidden" name="plan_id" value={plan.id} />
            <input type="hidden" name="position" value={gl.length} />
            <input name="title" className="input" placeholder="Ex.: Conduzir 3 reuniões de alinhamento com o time" required />
            <textarea name="description" className="input min-h-20" placeholder="Detalhes (opcional)" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="date" name="due_date" className="input" aria-label="Prazo" />
              <select name="course_id" className="input" defaultValue="">
                <option value="">Vincular a um curso (opcional)</option>
                {(courses ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <SubmitButton pendingText="Adicionando...">Adicionar meta</SubmitButton>
          </form>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="h-row">Anotações e feedbacks</h2>
        <NoteForm planId={plan.id} />
        <ul className="space-y-4">
          {(notes ?? []).map((n) => {
            const a = members.get(n.author_id as string);
            return (
              <li key={n.id} className="flex gap-3">
                <Avatar name={a?.full_name} url={a?.avatar_url} size={38} />
                <div className="flex-1 rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-navy-950">{a?.full_name ?? "Usuário"} <span className="font-normal text-slate-400">· {timeAgo(n.created_at as string)}</span></p>
                  <p className="prose-lite mt-1">{n.body as string}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {canManage && (
        <section className="rounded-2xl border border-slate-200 p-5 space-y-4">
          <h2 className="h-section">Gerenciar plano</h2>
          <form action={updatePlan} className="space-y-3">
            <input type="hidden" name="plan_id" value={plan.id} />
            <input name="title" className="input" defaultValue={plan.title} aria-label="Título" />
            <textarea name="description" className="input" defaultValue={plan.description ?? ""} aria-label="Descrição" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="date" name="due_date" className="input" defaultValue={plan.due_date ?? ""} aria-label="Prazo" />
              <select name="status" className="input" defaultValue={plan.status}>
                <option value="active">Em andamento</option>
                <option value="completed">Concluído</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <SubmitButton variant="secondary">Salvar plano</SubmitButton>
          </form>
          <form action={deletePlan}>
            <input type="hidden" name="plan_id" value={plan.id} />
            <input type="hidden" name="back" value={back} />
            <ConfirmButton message="Excluir este plano e todas as metas?">Excluir plano</ConfirmButton>
          </form>
        </section>
      )}
    </div>
  );
}
