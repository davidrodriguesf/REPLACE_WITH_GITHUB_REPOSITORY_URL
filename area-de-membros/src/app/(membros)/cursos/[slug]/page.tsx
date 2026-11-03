import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { Hero } from "@/components/Hero";
import { CourseThumb } from "@/components/CourseCard";
import { IconCheck, IconLock, IconPlay } from "@/components/Icons";
import type { Lesson, Module } from "@/lib/types";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, user, profile } = await requireUser();
  const catalog = await getCatalog(supabase, user.id, profile.role === "admin");
  const course = catalog.find((c) => c.slug === slug);
  if (!course) notFound();

  const hasAccess = course.status === "enrolled";
  const [{ data: modules }, { data: lessons }, { data: progress }, { data: request }] = await Promise.all([
    supabase.from("modules").select("*").eq("course_id", course.id).order("position"),
    supabase.from("lessons").select("id, module_id, title, description, duration_minutes, position").eq("course_id", course.id).order("position"),
    supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id),
    supabase.from("access_requests").select("status").eq("course_id", course.id).eq("user_id", user.id).maybeSingle(),
  ]);
  const done = new Set((progress ?? []).map((p) => p.lesson_id as string));
  const mods = (modules ?? []) as Module[];
  const lessonList = (lessons ?? []) as Lesson[];
  let n = 0;

  return (
    <div className="space-y-10">
      <Hero course={course} eyebrow={course.access_type === "free" ? "Curso gratuito" : "Curso"} showInfo={false} compact />

      {request?.status === "rejected" && !hasAccess && (
        <p className="alert alert-error">Sua solicitação não foi aprovada. Fale com o suporte se tiver dúvidas.</p>
      )}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-8 min-w-0">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold text-white">Aulas</h2>
            <p className="text-sm text-muted">{mods.length} módulo{mods.length === 1 ? "" : "s"}</p>
          </div>
          {mods.map((m) => {
            const ml = lessonList.filter((l) => l.module_id === m.id);
            return (
              <div key={m.id}>
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">{m.title}</h3>
                {hasAccess ? (
                  <ol className="divide-y divide-white/5 rounded-md overflow-hidden">
                    {ml.map((l) => {
                      n++;
                      const isDone = done.has(l.id);
                      return (
                        <li key={l.id}>
                          <Link href={`/cursos/${course.slug}/aula/${l.id}`} className="group flex items-center gap-4 p-3 sm:p-4 bg-surface hover:bg-surface-2 transition">
                            <span className="hidden sm:block w-8 text-center text-2xl font-black text-slate-400 tabular-nums">{n}</span>
                            <div className="relative w-28 sm:w-40 shrink-0 rounded overflow-hidden">
                              <CourseThumb course={course} />
                              <span className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
                                <span className="rounded-full border-2 border-white p-1.5 text-white"><IconPlay className="w-5 h-5" /></span>
                              </span>
                              {isDone && <span className="absolute bottom-0 inset-x-0 h-1 bg-brand-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <p className="font-semibold text-white leading-snug"><span className="sm:hidden text-slate-500">{n}. </span>{l.title}</p>
                                <span className="text-sm text-slate-500 whitespace-nowrap">{l.duration_minutes ? `${l.duration_minutes}min` : ""}</span>
                              </div>
                              {l.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2 hidden sm:block">{l.description}</p>}
                              {isDone && <p className="text-xs text-emerald-700 mt-1 flex items-center gap-1"><IconCheck className="w-3.5 h-3.5" />Assistida</p>}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                    {!ml.length && <li className="p-4 bg-surface text-sm text-muted">Aulas em breve.</li>}
                  </ol>
                ) : (
                  <div className="rounded-md bg-surface p-4 flex items-center justify-between gap-3 text-slate-500">
                    <span className="text-sm">{ml.length || "Algumas"} aula{ml.length === 1 ? "" : "s"} neste módulo</span>
                    <IconLock className="w-5 h-5" />
                  </div>
                )}
              </div>
            );
          })}
          {!mods.length && <p className="text-muted">Conteúdo em breve.</p>}
        </section>

        <aside className="space-y-4 lg:pt-12">
          <div className="rounded-md bg-surface p-5 space-y-3">
            <h3 className="font-bold text-white">Sobre este curso</h3>
            {course.description ? <p className="prose-lite text-sm">{course.description}</p> : <p className="text-sm text-muted">Sem descrição.</p>}
          </div>
          {!hasAccess && (
            <div className="rounded-md border border-white/10 p-5 text-sm text-slate-500 space-y-1">
              {course.access_type === "paid" ? (
                <p>O acesso é liberado automaticamente assim que o pagamento é confirmado. Você recebe um e-mail.</p>
              ) : (
                <p>Este curso é gratuito. Ao solicitar, nossa equipe analisa e libera o acesso. Você recebe um e-mail quando for aprovado.</p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
