"use client";

import { useActionState, useEffect, useRef } from "react";
import { inviteEmployeeAction, updateEmployee } from "../actions";
import { FormMessage, SubmitButton } from "@/components/ui";
import type { Profile } from "@/lib/types";

type Opt = { id: string; name: string };

function Fields({ roles, managers, p }: { roles: Opt[]; managers: Opt[]; p?: Profile }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Nome completo</label>
          <input className="input" name="full_name" defaultValue={p?.full_name ?? ""} />
        </div>
        <div>
          <label className="label">Departamento</label>
          <input className="input" name="department" defaultValue={p?.department ?? ""} placeholder="Ex.: Comercial" />
        </div>
        <div>
          <label className="label">Função (define a trilha)</label>
          <select className="input" name="job_role_id" defaultValue={p?.job_role_id ?? ""}>
            <option value="">Sem função</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Gestor(a)</label>
          <select className="input" name="manager_id" defaultValue={p?.manager_id ?? ""}>
            <option value="">Sem gestor</option>
            {managers.filter((m) => m.id !== p?.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Perfil de acesso</label>
          <select className="input" name="role" defaultValue={p?.role ?? "employee"}>
            <option value="employee">Colaborador</option>
            <option value="manager">Gestor (acompanha a equipe)</option>
            <option value="admin">Administrador (RH)</option>
          </select>
        </div>
        <div>
          <label className="label">Data de admissão</label>
          <input className="input" type="date" name="hired_at" defaultValue={p?.hired_at ?? ""} />
        </div>
      </div>
    </>
  );
}

export function InviteForm({ roles, managers }: { roles: Opt[]; managers: Opt[] }) {
  const [state, action] = useActionState(inviteEmployeeAction, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="card p-5 space-y-4">
      <div>
        <h2 className="h-section">Convidar colaborador</h2>
        <p className="text-sm text-slate-500">A pessoa recebe um e-mail para criar a senha. A trilha da função aparece automaticamente.</p>
      </div>
      <div>
        <label className="label">E-mail corporativo *</label>
        <input className="input" type="email" name="email" required />
      </div>
      <Fields roles={roles} managers={managers} />
      <FormMessage state={state} />
      <SubmitButton pendingText="Enviando convite...">Enviar convite</SubmitButton>
    </form>
  );
}

export function EditEmployeeForm({ p, roles, managers }: { p: Profile; roles: Opt[]; managers: Opt[] }) {
  const [state, action] = useActionState(updateEmployee, undefined);
  return (
    <form action={action} className="card p-5 space-y-4">
      <h2 className="h-section">Dados do colaborador</h2>
      <input type="hidden" name="id" value={p.id} />
      <Fields roles={roles} managers={managers} p={p} />
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="is_active" defaultChecked={p.is_active} /> Acesso ativo (desmarque quando a pessoa sair da empresa)
      </label>
      <FormMessage state={state} />
      <SubmitButton>Salvar</SubmitButton>
    </form>
  );
}
