import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { IconChevronLeft } from "@/components/Icons";
import { formatDateTime } from "@/lib/utils";
import { QuizRunner } from "./QuizRunner";

type QuizPayload = {
  id: string;
  title: string;
  description: string | null;
  kind: "quiz" | "exam";
  passing_score: number;
  max_attempts: number | null;
  time_limit_minutes: number | null;
  attempts_used: number;
  questions: { id: string; prompt: string; options: { id: string; text: string }[] }[];
};

export const metadata = { title: "Avaliação" };

export default async function QuizPage({ params }: { params: Promise<{ slug: string; quizId: string }> }) {
  const { slug, quizId } = await params;
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.rpc("get_quiz", { qid: quizId });
  if (error || !data) notFound();
  const quiz = data as QuizPayload;
  const { data: history } = await supabase.from("quiz_attempts").select("id, score, passed, submitted_at").eq("quiz_id", quizId).eq("user_id", user.id).order("submitted_at", { ascending: false });
  const attemptsLeft = quiz.max_attempts != null ? Math.max(0, quiz.max_attempts - quiz.attempts_used) : null;
  const backHref = `/cursos/${slug}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-navy-900"><IconChevronLeft className="w-4 h-4" />Voltar ao curso</Link>
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-gold-600">{quiz.kind === "exam" ? "Prova final" : "Quiz"}</p>
        <h1 className="h-page mt-1">{quiz.title}</h1>
        {quiz.description && <p className="mt-2 text-slate-600">{quiz.description}</p>}
      </div>
      {quiz.questions.length ? (
        <QuizRunner
          quizId={quiz.id}
          title={quiz.title}
          kind={quiz.kind}
          passingScore={quiz.passing_score}
          timeLimit={quiz.time_limit_minutes}
          attemptsLeft={attemptsLeft}
          questions={quiz.questions}
          backHref={backHref}
        />
      ) : (
        <p className="card p-6 text-slate-500">Esta avaliação ainda não tem questões.</p>
      )}
      {!!history?.length && (
        <section>
          <h2 className="h-section mb-3">Suas tentativas</h2>
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-slate-600">{formatDateTime(h.submitted_at)}</span>
                <span className={`font-bold ${h.passed ? "text-emerald-700" : "text-amber-700"}`}>{h.score}% {h.passed ? "· aprovado" : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
