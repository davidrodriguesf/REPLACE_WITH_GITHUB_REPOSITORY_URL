"use client";

import { useActionState, useEffect, useRef } from "react";
import { grantAccess } from "../actions";
import { FormMessage, SubmitButton } from "@/components/ui";

type C = { id: string; title: string; access_type: "paid" | "free" };

export function GrantForm({ courses, email, name }: { courses: C[]; email?: string; name?: string | null }) {
  const [state, action] = useActionState(grantAccess, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success && !email) ref.current?.reset();
  }, [state, email]);
  return (
    <form ref={ref} action={action} className="card p-5 space-y-4">
      <div>
        <h2 className="h-section">Liberar acesso</h2>
        <p className="text-sm text-muted">Use para cursos gratuitos, cortesias ou vendas feitas fora da Appmax. Se o aluno ainda não tiver conta, ela é criada e ele recebe o e-mail para criar a senha.</p>
      </div>
      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">E-mail do aluno *</label>
            <input className="input" name="email" type="email" required />
          </div>
          <div>
            <label className="label">Nome</label>
            <input className="input" name="name" />
          </div>
        </div>
      )}
      {email && <input type="hidden" name="name" value={name ?? ""} />}
      <div>
        <p className="label">Cursos</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {courses.map((c) => (
            <label key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
              <input type="checkbox" name="course_ids" value={c.id} />
              <span className="flex-1">{c.title}</span>
              {c.access_type === "free" && <span className="badge bg-emerald-100 text-emerald-800">Grátis</span>}
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="send_email" defaultChecked /> Enviar e-mail avisando o aluno
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Liberando...">Liberar acesso</SubmitButton>
    </form>
  );
}
