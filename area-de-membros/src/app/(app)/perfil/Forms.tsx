"use client";

import { useActionState } from "react";
import { changePassword, updateProfile } from "../actions";
import { FormMessage, SubmitButton } from "@/components/ui";
import type { Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateProfile, undefined);
  const f = (name: keyof Profile, label: string, type = "text") => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input className="input" id={name} name={name} type={type} defaultValue={(profile[name] as string | null) ?? ""} />
    </div>
  );
  return (
    <form action={action} className="card p-5 sm:p-6 space-y-4">
      <h2 className="h-section">Dados pessoais</h2>
      {f("full_name", "Nome completo")}
      <div>
        <label className="label">E-mail</label>
        <input className="input bg-slate-50 text-slate-500" value={profile.email} disabled />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {f("phone", "Telefone", "tel")}
        {f("avatar_url", "URL da foto", "url")}
        {f("state", "Estado")}
        {f("city", "Cidade")}
      </div>
      <div>
        <label className="label" htmlFor="bio">Sobre você</label>
        <textarea className="input" id="bio" name="bio" defaultValue={profile.bio ?? ""} maxLength={500} />
      </div>
      <p className="text-sm text-slate-500">Função, departamento e gestor são definidos pelo RH.</p>
      <FormMessage state={state} />
      <SubmitButton>Salvar</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="card p-5 sm:p-6 space-y-4">
      <h2 className="h-section">Alterar senha</h2>
      <input className="input" name="password" type="password" placeholder="Nova senha" minLength={8} autoComplete="new-password" required />
      <input className="input" name="confirm" type="password" placeholder="Confirme a nova senha" minLength={8} autoComplete="new-password" required />
      <FormMessage state={state} />
      <SubmitButton>Alterar senha</SubmitButton>
    </form>
  );
}
