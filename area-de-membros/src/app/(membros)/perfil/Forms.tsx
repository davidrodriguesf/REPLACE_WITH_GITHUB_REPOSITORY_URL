"use client";

import { useActionState } from "react";
import { changePassword, updateProfile } from "../actions";
import { FormMessage, SubmitButton } from "@/components/ui";
import type { Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="card p-5 space-y-4">
      <h2 className="h-section">Meus dados</h2>
      <div>
        <label className="label">E-mail</label>
        <input className="input bg-slate-50" value={profile.email} disabled />
      </div>
      <div>
        <label className="label" htmlFor="full_name">Nome</label>
        <input className="input" id="full_name" name="full_name" defaultValue={profile.full_name ?? ""} maxLength={120} />
      </div>
      <div>
        <label className="label" htmlFor="avatar_url">URL da foto (opcional)</label>
        <input className="input" id="avatar_url" name="avatar_url" type="url" defaultValue={profile.avatar_url ?? ""} placeholder="https://..." />
      </div>
      <div>
        <label className="label" htmlFor="bio">Sobre você</label>
        <textarea className="input" id="bio" name="bio" defaultValue={profile.bio ?? ""} maxLength={500} />
      </div>
      <FormMessage state={state} />
      <SubmitButton>Salvar</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="card p-5 space-y-4">
      <h2 className="h-section">Alterar senha</h2>
      <input className="input" name="password" type="password" placeholder="Nova senha" minLength={8} autoComplete="new-password" required />
      <input className="input" name="confirm" type="password" placeholder="Confirme a nova senha" minLength={8} autoComplete="new-password" required />
      <FormMessage state={state} />
      <SubmitButton>Alterar senha</SubmitButton>
    </form>
  );
}
