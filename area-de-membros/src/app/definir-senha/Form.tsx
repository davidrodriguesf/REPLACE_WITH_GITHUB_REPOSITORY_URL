"use client";

import { useActionState } from "react";
import { setPassword } from "../(auth)/actions";
import { FormMessage, SubmitButton } from "@/components/ui";

export function SetPasswordForm({ name }: { name: string }) {
  const [state, action] = useActionState(setPassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="full_name">Seu nome</label>
        <input className="input py-3.5 bg-slate-100/80" id="full_name" name="full_name" defaultValue={name} />
      </div>
      <div>
        <label className="label" htmlFor="password">Nova senha</label>
        <input className="input py-3.5 bg-slate-100/80" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
      </div>
      <div>
        <label className="label" htmlFor="confirm">Confirme a senha</label>
        <input className="input py-3.5 bg-slate-100/80" id="confirm" name="confirm" type="password" minLength={8} autoComplete="new-password" required />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full btn-lg">Salvar e entrar</SubmitButton>
    </form>
  );
}
