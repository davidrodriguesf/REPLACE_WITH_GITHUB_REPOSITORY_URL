"use client";

import { useActionState, useState } from "react";
import { saveCourse } from "../actions";
import { FileField } from "@/components/FileField";
import { FormMessage, SubmitButton } from "@/components/ui";
import type { Course } from "@/lib/types";

type Opt = { id: string; name: string };

export function CourseForm({ course, categories, roles, instructors, selectedRoles = [], selectedInstructors = [], marketplace = false }: {
  course?: Course; categories: Opt[]; roles: Opt[]; instructors: Opt[]; selectedRoles?: string[]; selectedInstructors?: string[];
  /** curso do marketplace do PestX (só o super admin cria/edita) */
  marketplace?: boolean;
}) {
  const [state, action] = useActionState(saveCourse, undefined);
  const [audience, setAudience] = useState(course?.audience ?? "all");
  return (
    <form action={action} className="card p-5 space-y-4">
      {course && <input type="hidden" name="id" value={course.id} />}
      {marketplace && <input type="hidden" name="marketplace" value="1" />}
      <div className="grid gap-3 sm:grid-cols-2">
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
        <label className="label">Sobre o curso</label>
        <textarea className="input" name="description" defaultValue={course?.description ?? ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3 grid gap-3 sm:grid-cols-2">
          <FileField name="cover" label="Capa do curso (imagem 16:9)" current={course?.cover_url} hint="PNG, JPG ou WEBP até 8 MB. Sem capa, o app gera uma com o título." />
          <FileField name="material" kind="pdf" label="Apostila / material do curso (PDF, opcional)" current={course?.material_url} hint="Até 50 MB. Aparece na página do curso para baixar." />
        </div>
        {marketplace && (
          <div>
            <label className="label">Preço para as empresas (R$) *</label>
            <input className="input" name="price" inputMode="decimal" defaultValue={course?.price ?? ""} placeholder="Ex.: 197,00" required />
          </div>
        )}
        <div>
          <label className="label">Categoria</label>
          <select className="input" name="category_id" defaultValue={course?.category_id ?? ""}>
            <option value="">Sem categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Carga horária (h)</label>
          <input className="input" name="workload_hours" inputMode="decimal" defaultValue={course?.workload_hours ?? ""} placeholder="Ex.: 4" />
        </div>
        <div>
          <label className="label">Ordem</label>
          <input className="input" name="position" type="number" defaultValue={course?.position ?? 0} />
        </div>
      </div>

      {!marketplace && <fieldset className="rounded-2xl border border-slate-200 p-4 space-y-3">
        <legend className="px-1 text-sm font-bold">Quem pode ver</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className={`rounded-xl border p-3 cursor-pointer ${audience === "all" ? "border-brand-600 bg-brand-50" : "border-slate-200"}`}>
            <input type="radio" name="audience" value="all" checked={audience === "all"} onChange={() => setAudience("all")} className="mr-2" />
            <strong>Todos os colaboradores</strong>
          </label>
          <label className={`rounded-xl border p-3 cursor-pointer ${audience === "roles" ? "border-brand-600 bg-brand-50" : "border-slate-200"}`}>
            <input type="radio" name="audience" value="roles" checked={audience === "roles"} onChange={() => setAudience("roles")} className="mr-2" />
            <strong>Só algumas funções</strong>
          </label>
        </div>
        {audience === "roles" && (
          <div className="grid gap-2 sm:grid-cols-2">
            {roles.map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="job_role_ids" value={r.id} defaultChecked={selectedRoles.includes(r.id)} />{r.name}</label>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-500">Cursos que estão numa trilha ou foram atribuídos a alguém ficam visíveis para essas pessoas de qualquer forma.</p>
      </fieldset>}

      {instructors.length > 0 && (
        <fieldset>
          <legend className="label">Mentores</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {instructors.map((i) => (
              <label key={i.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" name="instructor_ids" value={i.id} defaultChecked={selectedInstructors.includes(i.id)} />{i.name}</label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
        <label className="flex items-center gap-2"><input type="checkbox" name="is_published" defaultChecked={course?.is_published ?? false} />{marketplace ? "À venda no marketplace" : "Publicado"}</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="certificate_enabled" defaultChecked={course?.certificate_enabled ?? true} />Emite certificado</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="is_featured" defaultChecked={course?.is_featured ?? false} />Destaque em "Recomendados"</label>
      </div>
      <FormMessage state={state} />
      <SubmitButton>{course ? "Salvar curso" : "Criar curso"}</SubmitButton>
    </form>
  );
}
