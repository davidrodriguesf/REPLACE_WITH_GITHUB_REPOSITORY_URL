"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "../actions";
import { FormMessage, SubmitButton } from "@/components/ui";

export function LoginForm({ next, linkError, inactive }: { next?: string; linkError?: boolean; inactive?: boolean }) {
  const [state, action] = useActionState(
    login,
    inactive ? { error: "Seu acesso está desativado. Fale com o RH." } : linkError ? { error: "Link inválido ou expirado. Peça um novo em “Esqueci minha senha”." } : undefined,
  );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full btn-lg" pendingText="Entrando...">Entrar</SubmitButton>
      <p className="text-center text-sm">
        <Link href="/esqueci-senha" className="link">Esqueci minha senha / primeiro acesso</Link>
      </p>
    </form>
  );
}
