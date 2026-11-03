"use client";

import { useActionState, useState } from "react";
import { createPost } from "../actions";
import { FormMessage, SubmitButton } from "@/components/ui";
import type { Space } from "@/lib/types";

export function NewPostForm({ spaces, defaultSpaceId }: { spaces: Space[]; defaultSpaceId?: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createPost, undefined);
  if (!spaces.length) return null;
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="card w-full p-4 text-left text-muted hover:border-brand-200 cursor-pointer">
        ✍️ Compartilhe algo com a comunidade...
      </button>
    );
  return (
    <form action={action} className="card p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
        <select name="space_id" className="input" defaultValue={defaultSpaceId ?? spaces[0]!.id}>
          {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input name="title" className="input" placeholder="Título" maxLength={200} required />
      </div>
      <textarea name="body" className="input" placeholder="Escreva sua mensagem..." required maxLength={10000} />
      <FormMessage state={state} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">Cancelar</button>
        <SubmitButton pendingText="Publicando...">Publicar</SubmitButton>
      </div>
    </form>
  );
}
