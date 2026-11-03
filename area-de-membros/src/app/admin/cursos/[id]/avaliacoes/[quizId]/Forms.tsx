"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveQuestion, saveQuiz } from "../../../../actions";
import { FormMessage, SubmitButton } from "@/components/ui";
import type { Quiz } from "@/lib/types";

export function QuizSettingsForm({ quiz, lessons }: { quiz: Quiz; lessons: { id: string; title: string }[] }) {
  const [state, action] = useActionState(saveQuiz, undefined);
  return (
    <form action={action} className="card p-5 space-y-4">
      <input type="hidden" name="id" value={quiz.id} />
      <input type="hidden" name="course_id" value={quiz.course_id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Título</label>
          <input className="input" name="title" defaultValue={quiz.title} />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select className="input" name="lesson_id" defaultValue={quiz.lesson_id ?? ""}>
            <option value="">Prova final do curso</option>
            {lessons.map((l) => <option key={l.id} value={l.id}>Quiz da aula: {l.title}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Instruções</label>
        <textarea className="input min-h-20" name="description" defaultValue={quiz.description ?? ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="label">Nota mínima (%)</label><input className="input" name="passing_score" type="number" min={0} max={100} defaultValue={quiz.passing_score} /></div>
        <div><label className="label">Tentativas (vazio = livre)</label><input className="input" name="max_attempts" type="number" min={1} defaultValue={quiz.max_attempts ?? ""} /></div>
        <div><label className="label">Tempo em min (vazio = livre)</label><input className="input" name="time_limit_minutes" type="number" min={1} defaultValue={quiz.time_limit_minutes ?? ""} /></div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
        <label className="flex items-center gap-2"><input type="checkbox" name="show_answers" defaultChecked={quiz.show_answers} />Mostrar gabarito após enviar</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="is_published" defaultChecked={quiz.is_published} />Publicada</label>
      </div>
      <FormMessage state={state} />
      <SubmitButton>Salvar configurações</SubmitButton>
    </form>
  );
}

export function QuestionForm({ quizId, position, question }: { quizId: string; position: number; question?: { id: string; prompt: string; explanation: string | null; options: { text: string; is_correct: boolean }[] } }) {
  const [state, action] = useActionState(saveQuestion, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success && !question) ref.current?.reset();
  }, [state, question]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      {question && <input type="hidden" name="id" value={question.id} />}
      <input type="hidden" name="quiz_id" value={quizId} />
      <input type="hidden" name="position" value={position} />
      <textarea className="input min-h-20" name="prompt" defaultValue={question?.prompt} placeholder="Pergunta" required />
      <textarea
        className="input min-h-32 font-mono text-sm"
        name="options"
        defaultValue={question?.options.map((o) => (o.is_correct ? "*" : "") + o.text).join("\n")}
        placeholder={"Uma alternativa por linha. Marque a correta com * no início:\nOuvir o cliente antes de oferecer\n*Entender a necessidade e depois propor a solução\nFalar do preço logo no início"}
        required
      />
      <input className="input" name="explanation" defaultValue={question?.explanation ?? ""} placeholder="Explicação da resposta (opcional, aparece no gabarito)" />
      <FormMessage state={state} />
      <SubmitButton variant={question ? "secondary" : "primary"} pendingText="Salvando...">{question ? "Salvar questão" : "Adicionar questão"}</SubmitButton>
    </form>
  );
}
