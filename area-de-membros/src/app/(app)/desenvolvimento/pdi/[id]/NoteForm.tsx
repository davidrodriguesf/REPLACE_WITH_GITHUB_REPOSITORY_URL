"use client";

import { useActionState, useEffect, useRef } from "react";
import { addPlanNote } from "@/app/(app)/actions";
import { FormMessage, SubmitButton } from "@/components/ui";

export function NoteForm({ planId }: { planId: string }) {
  const [state, action] = useActionState(addPlanNote, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="plan_id" value={planId} />
      <textarea name="body" className="input" placeholder="Registre um avanço, uma conversa de feedback ou um próximo passo..." required />
      {state?.error && <FormMessage state={state} />}
      <div className="flex justify-end"><SubmitButton pendingText="Salvando...">Adicionar anotação</SubmitButton></div>
    </form>
  );
}
