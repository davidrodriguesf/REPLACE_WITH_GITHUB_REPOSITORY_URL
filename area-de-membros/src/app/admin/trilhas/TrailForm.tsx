"use client";

import { useActionState } from "react";
import { saveTrail } from "../actions";
import { FileField } from "@/components/FileField";
import { FormMessage, SubmitButton } from "@/components/ui";
import type { Trail } from "@/lib/types";

export function TrailForm({ trail, roles, selected }: { trail?: Trail; roles: { id: string; name: string }[]; selected?: string[] }) {
  const [state, action] = useActionState(saveTrail, undefined);
  return (
    <form action={action} className="card p-5 space-y-4">
      {trail && <input type="hidden" name="id" value={trail.id} />}
      <div>
        <label className="label">Nome da trilha *</label>
        <input className="input" name="title" defaultValue={trail?.title} placeholder="Ex.: Trilha do Vendedor" required />
      </div>
      <div>
        <label className="label">Descrição</label>
        <textarea className="input" name="description" defaultValue={trail?.description ?? ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
        <div>
          <FileField name="cover" label="Capa (opcional, 16:9)" current={trail?.cover_url} />
        </div>
        <div>
          <label className="label">Ordem</label>
          <input className="input" name="position" type="number" defaultValue={trail?.position ?? 0} />
        </div>
      </div>
      <fieldset>
        <legend className="label">Funções que recebem esta trilha</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {roles.map((r) => (
            <label key={r.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm cursor-pointer hover:bg-slate-50">
              <input type="checkbox" name="job_role_ids" value={r.id} defaultChecked={selected?.includes(r.id)} /> {r.name}
            </label>
          ))}
          {!roles.length && <p className="text-sm text-slate-500">Cadastre as funções primeiro.</p>}
        </div>
      </fieldset>
      <FormMessage state={state} />
      <SubmitButton>{trail ? "Salvar trilha" : "Criar trilha"}</SubmitButton>
    </form>
  );
}
