"use client";

import { useActionState } from "react";
import { createFirstAdmin, prepareDatabase } from "./actions";
import { FormMessage, SubmitButton } from "@/components/ui";

export function SetupForm() {
  const [state, action] = useActionState(createFirstAdmin, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="setup_key">Chave de instalação</label>
        <input className="input" id="setup_key" name="setup_key" type="password" required autoComplete="off" />
        <p className="mt-1 text-xs text-slate-500">É o valor da variável SETUP_KEY configurada na hospedagem.</p>
      </div>
      <div>
        <label className="label" htmlFor="full_name">Seu nome</label>
        <input className="input" id="full_name" name="full_name" defaultValue={state?.values?.full_name} required />
      </div>
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input className="input" id="email" name="email" type="email" defaultValue={state?.values?.email} required />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input className="input" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full btn-lg" pendingText="Criando...">Criar administrador</SubmitButton>
    </form>
  );
}

export function PrepareForm() {
  const [state, action] = useActionState(prepareDatabase, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="setup_key_db">Chave de instalação</label>
        <input className="input" id="setup_key_db" name="setup_key" type="password" required autoComplete="off" />
        <p className="mt-1 text-xs text-slate-500">É o valor da variável SETUP_KEY configurada na hospedagem.</p>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full btn-lg" pendingText="Preparando (alguns segundos)...">Preparar banco de dados</SubmitButton>
    </form>
  );
}
