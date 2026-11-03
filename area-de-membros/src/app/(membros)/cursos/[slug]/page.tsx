import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { requestAccess } from "../../actions";
import { SubmitButton } from "@/components/ui";
import { IconCheck, IconGift, IconLock, IconPlay } from "@/components/Icons";
import type { Course, Lesson, Module } from "@/lib/types";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, user, profile } = await requireUser();
  const { data: course } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle<Course>();
  if (!course) notFound();

  const [{ data: modules }, { data: enrollment }, { data: request }, { data: lessons }, { data: progress }] = await Promise.all([
    supabase.from("modules").select("*").eq("course_id", course.id).order("position"),
    supabase.from("enrollments").select("expires_at").eq("course_id", course.id).eq("user_id", user.id).maybeSingle(),
    supabase.from("access_requests").select("status").eq("course_id", course.id).eq("user_id", user.id).maybeSingle(),
    supabase.from("lessons").select("id, module_id, title, duration_minutes, position").eq("course_id", course.id).order("position"),
    supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id),
  ]);

  const hasAccess =
    profile.role === "admin" || (!!enrollment && (!enrollment.expires_at || new Date(enrollment.expires_at) > new Date()));
  const done = new Set((progress ?? []).map((p) => p.lesson_id as string));
  const lessonList = (lessons ?? []) as Lesson[];
  const firstPending = lessonList.find((l) => !done.has(l.id)) ?? lessonList[0];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <div className="card overflow-hidden">
          <div className="relative aspect-[21/9] bg-gradient-to-br from-brand-600 to-fuchsia-500">
            {course.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={course.cover_url} alt="" className={`absolute inset-0 w-full h-full object-cover ${hasAccess ? "" : "grayscale opacity-70"}`} />
            )}
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-2 mb-2">
              {course.access_type === "free" ? (
                <span className="badge bg-emerald-100 text-emerald-800"><IconGift className="w-3.5 h-3.5" />Gratuito</span>
              ) : (
                <span className="badge bg-brand-100 text-brand-700">Curso</span>
              )}
              {hasAccess && <span className="badge bg-slate-100 text-slate-700">Liberado</span>}
            </div>
            <h1 className="h-page">{course.title}</h1>
            {course.subtitle && <p className="text-muted mt-1">{course.subtitle}</p>}
            {course.description && <p className="prose-lite mt-4">{course.description}</p>}
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        {hasAccess ? (
          firstPending && (
            <Link href={`/cursos/${course.slug}/aula/${firstPending.id}`} className="btn btn-primary w-full">
              <IconPlay /> {done.size ? "Continuar curso" : "Começar curso"}
            </Link>
          )
        ) : (
          <div className="card p-5 space-y-3">
            <p className="flex items-center gap-2 font-semibold"><IconLock /> Conteúdo bloqueado</p>
            {course.access_type === "paid" ? (
              <>
                <p className="text-sm text-muted">Adquira este curso para liberar todas as aulas. O acesso é liberado automaticamente após a confirmação do pagamento.</p>
                {course.checkout_url && (
                  <a href={course.checkout_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full">Quero este curso</a>
                )}
              </>
            ) : request?.status === "pending" ? (
              <p className="alert bg-amber-50 text-amber-800 border border-amber-200">Sua solicitação foi enviada! Assim que a equipe aprovar, o curso aparece em “Meus cursos”.</p>
            ) : request?.status === "rejected" ? (
              <p className="text-sm text-muted">Sua solicitação não foi aprovada. Fale com o suporte se tiver dúvidas.</p>
            ) : (
              <form action={requestAccess} className="space-y-3">
                <p className="text-sm text-muted">Este curso é gratuito. Solicite o acesso e nossa equipe vai liberar para você.</p>
                <input type="hidden" name="course_id" value={course.id} />
                <textarea name="message" className="input" placeholder="(opcional) Conte por que quer fazer este curso" maxLength={500} />
                <SubmitButton className="w-full" pendingText="Enviando...">Solicitar acesso gratuito</SubmitButton>
              </form>
            )}
          </div>
        )}

        <div className="card p-2">
          <p className="px-3 pt-3 pb-1 font-semibold">Conteúdo do curso</p>
          {((modules ?? []) as Module[]).map((m, i) => {
            const ml = lessonList.filter((l) => l.module_id === m.id);
            return (
              <details key={m.id} open={i === 0} className="group border-t border-slate-100 first-of-type:border-0">
                <summary className="cursor-pointer list-none px-3 py-3 flex items-center justify-between font-medium">
                  <span>{m.title}</span>
                  <span className="text-xs text-muted">{hasAccess ? `${ml.filter((l) => done.has(l.id)).length}/${ml.length}` : <IconLock className="w-4 h-4" />}</span>
                </summary>
                {hasAccess && (
                  <ul className="pb-2">
                    {ml.map((l) => (
                      <li key={l.id}>
                        <Link href={`/cursos/${course.slug}/aula/${l.id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                          {done.has(l.id) ? <IconCheck className="w-4 h-4 text-emerald-600" /> : <IconPlay className="w-4 h-4 text-slate-400" />}
                          <span className="flex-1">{l.title}</span>
                          {l.duration_minutes ? <span className="text-xs text-muted">{l.duration_minutes} min</span> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            );
          })}
          {!modules?.length && <p className="px-3 pb-3 text-sm text-muted">Em breve.</p>}
        </div>
      </aside>
    </div>
  );
}
