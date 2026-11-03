import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { deleteQuestion, deleteQuiz } from "../../../../actions";
import { ConfirmButton } from "@/components/ui";
import { IconChevronLeft } from "@/components/Icons";
import type { Quiz } from "@/lib/types";
import { QuestionForm, QuizSettingsForm } from "./Forms";

type Q = { id: string; prompt: string; explanation: string | null; position: number; quiz_options: { id: string; text: string; is_correct: boolean; position: number }[] };

export default async function QuizAdmin({ params }: { params: Promise<{ id: string; quizId: string }> }) {
  const { id, quizId } = await params;
  const { supabase } = await requireAdmin();
  const { data: quiz } = await supabase.from("quizzes").select("*").eq("id", quizId).maybeSingle<Quiz>();
  if (!quiz) notFound();
  const [{ data: qs }, { data: lessons }, { data: attempts }] = await Promise.all([
    supabase.from("quiz_questions").select("id, prompt, explanation, position, quiz_options(id, text, is_correct, position)").eq("quiz_id", quizId).order("position"),
    supabase.from("lessons").select("id, title").eq("course_id", id).order("position"),
    supabase.from("quiz_attempts").select("score, passed").eq("quiz_id", quizId),
  ]);
  const questions = (qs ?? []) as Q[];
  const n = attempts?.length ?? 0;
  const avg = n ? Math.round((attempts ?? []).reduce((s, a) => s + (a.score as number), 0) / n) : null;
  const passRate = n ? Math.round(((attempts ?? []).filter((a) => a.passed).length / n) * 100) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/admin/cursos/${id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-navy-900"><IconChevronLeft className="w-4 h-4" />Voltar ao curso</Link>
        <form action={deleteQuiz}>
          <input type="hidden" name="id" value={quiz.id} />
          <input type="hidden" name="course_id" value={id} />
          <ConfirmButton message="Excluir esta avaliação e todas as tentativas?">Excluir avaliação</ConfirmButton>
        </form>
      </div>
      <div>
        <h1 className="h-page">{quiz.title}</h1>
        <p className="mt-1 text-slate-500">{questions.length} questões · {n} tentativas{avg !== null ? ` · média ${avg}% · ${passRate}% de aprovação` : ""}</p>
      </div>
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
        <QuizSettingsForm quiz={quiz} lessons={(lessons ?? []) as { id: string; title: string }[]} />
        <section className="space-y-4">
          <h2 className="h-section">Questões</h2>
          {questions.map((q, i) => (
            <details key={q.id} className="card p-4">
              <summary className="cursor-pointer list-none">
                <p className="font-semibold text-navy-950">{i + 1}. {q.prompt}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {[...q.quiz_options].sort((a, b) => a.position - b.position).map((o) => (
                    <li key={o.id} className={o.is_correct ? "font-semibold text-emerald-700" : "text-slate-500"}>{o.is_correct ? "✓" : "•"} {o.text}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs font-semibold text-navy-700">Clique para editar</p>
              </summary>
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <QuestionForm quizId={quiz.id} position={q.position} question={{ id: q.id, prompt: q.prompt, explanation: q.explanation, options: [...q.quiz_options].sort((a, b) => a.position - b.position) }} />
                <form action={deleteQuestion}>
                  <input type="hidden" name="id" value={q.id} />
                  <ConfirmButton message="Excluir esta questão?" variant="ghost" className="btn-sm">Excluir questão</ConfirmButton>
                </form>
              </div>
            </details>
          ))}
          <div className="card border-dashed p-4">
            <p className="mb-3 font-bold text-navy-950">Nova questão</p>
            <QuestionForm quizId={quiz.id} position={questions.length} />
          </div>
        </section>
      </div>
    </div>
  );
}
