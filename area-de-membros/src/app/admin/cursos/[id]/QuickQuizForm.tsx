"use client";

import { useActionState } from "react";
import { saveQuiz } from "../../actions";
import { FormMessage, SubmitButton } from "@/components/ui";

export function QuickQuizForm({ courseId, lessons }: { courseId: string; lessons: { id: string; title: string }[] }) {
  const [state, action] = useActionState(saveQuiz, undefined);
  return (
    <form action={action} className="rounded-2xl border border-dashed border-slate-300 p-4 space-y-3">
      <p className="text-sm font-semibold text-navy-950">Adicionar quiz a uma aula</p>
      <input type="hidden" name="course_id" value={courseId} />
      <input type="hidden" name="kind" value="quiz" />
      <input type="hidden" name="passing_score" value="60" />
      <input type="hidden" name="show_answers" value="on" />
      <input type="hidden" name="is_published" value="on" />
      <div className="flex flex-wrap gap-2">
        <select name="lesson_id" className="input flex-1 min-w-[200px]" required defaultValue="">
          <option value="" disabled>Escolha a aula</option>
          {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
        <SubmitButton variant="secondary" pendingText="...">Criar quiz</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
