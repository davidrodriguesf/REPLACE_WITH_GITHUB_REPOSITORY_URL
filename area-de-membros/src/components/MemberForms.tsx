"use client";

import { useActionState } from "react";
import { assignCourse, createPlan } from "@/app/(app)/equipe/actions";
import { FormMessage, SubmitButton } from "./ui";

export function CreatePlanForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(createPlan, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="user_id" value={userId} />
      <input name="title" className="input" placeholder="Título do plano (ex.: PDI 1º semestre)" required />
      <textarea name="description" className="input min-h-20" placeholder="Objetivo geral do plano" />
      <textarea name="goals" className="input min-h-28" placeholder={"Metas, uma por linha:\nConcluir a trilha da função\nApresentar um case para o time\nFazer o curso de Negociação"} />
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-slate-600">Prazo <input type="date" name="due_date" className="input mt-1" /></label>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Criando...">Criar PDI</SubmitButton>
    </form>
  );
}

export function AssignCourseForm({ userId, courses }: { userId: string; courses: { id: string; title: string }[] }) {
  const [state, action] = useActionState(assignCourse, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="user_id" value={userId} />
      <select name="course_id" className="input" defaultValue="" required>
        <option value="" disabled>Escolha um curso</option>
        {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>
      <label className="block text-sm font-semibold text-slate-600">Prazo (opcional)<input type="date" name="due_date" className="input mt-1" /></label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Atribuindo...">Atribuir curso</SubmitButton>
    </form>
  );
}
