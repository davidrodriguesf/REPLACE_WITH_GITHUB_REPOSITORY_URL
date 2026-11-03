"use client";

import { useActionState, useEffect, useRef } from "react";
import { createComment } from "../../actions";
import { FormMessage, SubmitButton } from "@/components/ui";

export function CommentForm({ postId }: { postId: string }) {
  const [state, action] = useActionState(createComment, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="post_id" value={postId} />
      <textarea name="body" className="input" placeholder="Escreva um comentário..." required maxLength={5000} />
      {state?.error && <FormMessage state={state} />}
      <div className="flex justify-end"><SubmitButton pendingText="Enviando...">Comentar</SubmitButton></div>
    </form>
  );
}
