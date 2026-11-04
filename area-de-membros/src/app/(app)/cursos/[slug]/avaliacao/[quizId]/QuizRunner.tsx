"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { submitQuiz, type QuizResult } from "@/app/(app)/actions";
import { IconAward, IconCheck, IconClock, IconX } from "@/components/Icons";

type Q = { id: string; prompt: string; options: { id: string; text: string }[] };
type Props = {
  quizId: string;
  title: string;
  kind: "quiz" | "exam";
  passingScore: number;
  timeLimit: number | null;
  attemptsLeft: number | null;
  questions: Q[];
  backHref: string;
};

export function QuizRunner({ quizId, title, kind, passingScore, timeLimit, attemptsLeft, questions, backHref }: Props) {
  const [started, setStarted] = useState(kind === "quiz");
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [left, setLeft] = useState(timeLimit ? timeLimit * 60 : null);

  const send = () =>
    start(async () => {
      const r = await submitQuiz(quizId, answers);
      if (r.error) setError(r.error);
      else if (r.result) setResult(r.result);
    });

  useEffect(() => {
    if (!started || left === null || result) return;
    if (left <= 0) {
      send();
      return;
    }
    const t = setTimeout(() => setLeft((s) => (s ?? 0) - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, left, result]);

  const answered = useMemo(() => questions.filter((q) => answers[q.id]).length, [answers, questions]);
  const q = questions[i];

  if (result) {
    const byId = new Map(result.results.map((r) => [r.question_id, r]));
    return (
      <div className="space-y-6">
        <div className={`rounded-3xl p-6 sm:p-8 text-center ${result.passed ? "bg-emerald-50" : "bg-amber-50"}`}>
          <p className={`text-6xl font-extrabold tabular-nums ${result.passed ? "text-emerald-700" : "text-amber-700"}`}>{result.score}%</p>
          <p className="mt-2 text-xl font-bold text-navy-950">{result.passed ? "Parabéns, você foi aprovado(a)!" : "Ainda não foi desta vez"}</p>
          <p className="mt-1 text-slate-600">
            {result.correct} de {result.total} acertos · nota mínima {result.passing_score}%
            {result.max_attempts ? ` · tentativa ${result.attempts_used} de ${result.max_attempts}` : ""}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {result.certificateId && (
              <Link href={`/certificados/${result.certificateId}`} className="btn btn-primary"><IconAward className="w-5 h-5" />Ver certificado</Link>
            )}
            {!result.passed && (result.max_attempts === null || result.attempts_used < result.max_attempts) && (
              <button onClick={() => { setResult(null); setAnswers({}); setI(0); setLeft(timeLimit ? timeLimit * 60 : null); }} className="btn btn-primary">Tentar novamente</button>
            )}
            <Link href={backHref} className="btn btn-light">Voltar ao curso</Link>
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((qq, n) => {
            const r = byId.get(qq.id);
            return (
              <div key={qq.id} className="rounded-2xl border border-slate-200 p-5">
                <p className="flex items-start gap-3 font-semibold text-navy-950">
                  <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-white ${r?.is_correct ? "bg-emerald-600" : "bg-red-500"}`}>
                    {r?.is_correct ? <IconCheck className="w-4 h-4" /> : <IconX className="w-4 h-4" />}
                  </span>
                  {n + 1}. {qq.prompt}
                </p>
                <ul className="mt-3 space-y-2 pl-10">
                  {qq.options.map((o) => {
                    const chosen = r?.chosen === o.id;
                    const correct = r?.correct_option === o.id;
                    return (
                      <li key={o.id} className={`rounded-xl px-3 py-2 text-[15px] ${correct ? "bg-emerald-50 text-emerald-800 font-semibold" : chosen ? "bg-red-50 text-red-700" : "text-slate-600"}`}>
                        {o.text} {chosen && "· sua resposta"} {correct && "· correta"}
                      </li>
                    );
                  })}
                </ul>
                {r?.explanation && <p className="mt-3 pl-10 text-sm text-slate-500">{r.explanation}</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5">
        <h2 className="text-2xl font-bold text-navy-950">{title}</h2>
        <ul className="space-y-2 text-[16px] text-slate-600">
          <li>• {questions.length} questões de múltipla escolha</li>
          <li>• Nota mínima para aprovação: <strong>{passingScore}%</strong></li>
          {timeLimit && <li>• Tempo: <strong>{timeLimit} minutos</strong> (envia sozinho ao acabar)</li>}
          {attemptsLeft !== null && <li>• Tentativas restantes: <strong>{attemptsLeft}</strong></li>}
        </ul>
        <button onClick={() => setStarted(true)} disabled={attemptsLeft === 0} className="btn btn-primary btn-lg w-full">
          {attemptsLeft === 0 ? "Sem tentativas restantes" : "Começar prova"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="font-semibold text-slate-500">Questão {i + 1} de {questions.length}</p>
        {left !== null && (
          <span className={`badge ${left < 60 ? "bg-red-50 text-red-700" : "bg-slate-100 text-navy-900"}`}>
            <IconClock className="w-4 h-4" />{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
          </span>
        )}
      </div>
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-brand-600 transition-all" style={{ width: `${((i + 1) / questions.length) * 100}%` }} /></div>

      {q && (
        <fieldset className="space-y-3">
          <legend className="mb-4 text-xl sm:text-2xl font-bold leading-snug text-navy-950">{q.prompt}</legend>
          {q.options.map((o, n) => {
            const sel = answers[q.id] === o.id;
            return (
              <label key={o.id} className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 text-[16px] transition ${sel ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:border-slate-300"}`}>
                <input type="radio" name={q.id} value={o.id} checked={sel} onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))} className="sr-only" />
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold ${sel ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}>{String.fromCharCode(65 + n)}</span>
                <span className="text-navy-900">{o.text}</span>
              </label>
            );
          })}
        </fieldset>
      )}

      {error && <p className="alert alert-error">{error}</p>}

      <div className="flex gap-3">
        <button onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0} className="btn btn-light">Anterior</button>
        {i < questions.length - 1 ? (
          <button onClick={() => setI((n) => n + 1)} disabled={!answers[q?.id ?? ""]} className="btn btn-primary flex-1">Próxima</button>
        ) : (
          <button onClick={send} disabled={pending || answered < questions.length} className="btn btn-primary flex-1">
            {pending ? "Enviando..." : answered < questions.length ? `Responda todas (${answered}/${questions.length})` : "Enviar respostas"}
          </button>
        )}
      </div>
    </div>
  );
}
