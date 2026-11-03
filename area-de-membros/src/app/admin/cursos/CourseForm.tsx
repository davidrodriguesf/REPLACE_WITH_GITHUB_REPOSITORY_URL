"use client";

import { useActionState, useState } from "react";
import { saveCourse } from "../actions";
import { FormMessage, SubmitButton } from "@/components/ui";
import type { Course } from "@/lib/types";

export function CourseForm({ course }: { course?: Course }) {
  const [state, action] = useActionState(saveCourse, undefined);
  const [type, setType] = useState(course?.access_type ?? "paid");
  return (
    <form action={action} className="card p-5 space-y-4">
      {course && <input type="hidden" name="id" value={course.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Título *</label>
          <input className="input" name="title" defaultValue={course?.title} required />
        </div>
        <div>
          <label className="label">Endereço (slug)</label>
          <input className="input" name="slug" defaultValue={course?.slug} placeholder="gerado a partir do título" />
        </div>
      </div>
      <div>
        <label className="label">Subtítulo</label>
        <input className="input" name="subtitle" defaultValue={course?.subtitle ?? ""} />
      </div>
      <div>
        <label className="label">Descrição</label>
        <textarea className="input" name="description" defaultValue={course?.description ?? ""} />
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <div>
          <label className="label">URL da capa (16:9)</label>
          <input className="input" name="cover_url" type="url" defaultValue={course?.cover_url ?? ""} placeholder="https://..." />
        </div>
        <div>
          <label className="label">Ordem</label>
          <input className="input" name="position" type="number" defaultValue={course?.position ?? 0} />
        </div>
      </div>

      <fieldset className="rounded-xl border border-slate-200 p-4 space-y-4">
        <legend className="px-1 text-sm font-semibold">Tipo de acesso</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`rounded-xl border p-3 cursor-pointer ${type === "paid" ? "border-brand-500 bg-brand-50" : "border-slate-200"}`}>
            <input type="radio" name="access_type" value="paid" checked={type === "paid"} onChange={() => setType("paid")} className="mr-2" />
            <strong>Pago</strong>
            <p className="text-xs text-muted mt-1">Liberado automaticamente quando a Appmax confirma o pagamento (ou manualmente por você).</p>
          </label>
          <label className={`rounded-xl border p-3 cursor-pointer ${type === "free" ? "border-brand-500 bg-brand-50" : "border-slate-200"}`}>
            <input type="radio" name="access_type" value="free" checked={type === "free"} onChange={() => setType("free")} className="mr-2" />
            <strong>Gratuito (liberado pelo admin)</strong>
            <p className="text-xs text-muted mt-1">O aluno não paga. Ele solicita e você aprova, ou você libera direto em “Alunos & acessos”.</p>
          </label>
        </div>
        {type === "paid" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Link do checkout (Appmax)</label>
              <input className="input" name="checkout_url" type="url" defaultValue={course?.checkout_url ?? ""} placeholder="https://..." />
            </div>
            <div>
              <label className="label">ID(s) / SKU(s) do produto na Appmax</label>
              <input className="input" name="appmax_product_ids" defaultValue={course?.appmax_product_ids?.join(", ") ?? ""} placeholder="ex.: 12345, CURSO-01" />
              <p className="text-xs text-muted mt-1">Separe por vírgula. É assim que o webhook sabe qual curso liberar.</p>
            </div>
          </div>
        )}
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_published" defaultChecked={course?.is_published ?? false} /> Publicado (visível para os alunos)
      </label>
      <FormMessage state={state} />
      <SubmitButton>{course ? "Salvar curso" : "Criar curso"}</SubmitButton>
    </form>
  );
}
