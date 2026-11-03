"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "../actions";
import { FormMessage, SubmitButton } from "@/components/ui";

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input className="input py-3.5 bg-slate-100/80" id="email" name="email" type="email" required />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full btn-lg" pendingText="Enviando...">Enviar link</SubmitButton>
    </form>
  );
}
