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
        <input className="input" id="full_name" name="full_name" defaultValue={name} />
      </div>
      <div>
        <label className="label" htmlFor="password">Nova senha</label>
        <input className="input" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
      </div>
      <div>
        <label className="label" htmlFor="confirm">Confirme a senha</label>
        <input className="input" id="confirm" name="confirm" type="password" minLength={8} autoComplete="new-password" required />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full btn-lg">Salvar e entrar</SubmitButton>
    </form>
  );
}
