import Link from "next/link";
import { requestAccess } from "@/app/(membros)/actions";
import type { CatalogCourse } from "@/lib/catalog";
import { formatMinutes } from "@/lib/catalog";
import { SubmitButton } from "./ui";
import { IconInfo, IconLock, IconPlay } from "./Icons";

/** Banner principal de ponta a ponta com o curso em destaque. */
export function Hero({ course, eyebrow, showInfo = true, compact = false }: { course: CatalogCourse; eyebrow?: string; showInfo?: boolean; compact?: boolean }) {
  const pct = course.totalLessons ? Math.round((course.doneLessons / course.totalLessons) * 100) : 0;
  const meta = [
    course.access_type === "free" ? "Gratuito" : null,
    course.totalLessons ? `${course.totalLessons} aulas` : null,
    formatMinutes(course.totalMinutes) || null,
  ].filter(Boolean);

  return (
    <section className={`relative bleed -mt-20 sm:-mt-24 ${compact ? "min-h-[440px] sm:min-h-[520px]" : "min-h-[520px] sm:min-h-[600px] lg:h-[78vh] lg:max-h-[760px]"} flex items-end`}>
      <div className="absolute inset-0 overflow-hidden">
        {course.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.cover_url} alt="" className="w-full h-full object-cover object-center" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-600 via-brand-100 to-ink" />
        )}
        <div className="absolute inset-0 hero-fade-left" />
        <div className="absolute inset-0 hero-fade-bottom" />
      </div>

      <div className={`relative gutter w-full pt-32 ${compact ? "pb-10 sm:pb-14" : "pb-10 sm:pb-36"}`}>
        <div className="max-w-xl space-y-4">
          {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-700">{eyebrow}</p>}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[0.95] text-balance drop-shadow-lg">{course.title}</h1>
          {meta.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-slate-700">
              {course.status === "enrolled" && pct > 0 && <span className="text-emerald-700">{pct}% concluído</span>}
              {meta.map((m) => <span key={m}>{m}</span>)}
            </p>
          )}
          {(course.subtitle || course.description) && (
            <p className="text-base sm:text-lg text-slate-700 line-clamp-3 drop-shadow">{course.subtitle || course.description}</p>
          )}

          {course.status === "enrolled" && course.nextLesson && pct > 0 && pct < 100 && (
            <div className="max-w-sm">
              <div className="h-1 rounded bg-white/25 overflow-hidden"><div className="h-full bg-brand-600" style={{ width: `${pct}%` }} /></div>
              <p className="text-xs text-slate-600 mt-1.5">Próxima: Aula {course.nextLesson.number} · {course.nextLesson.title}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            {course.status === "enrolled" && course.nextLesson && (
              <Link href={`/cursos/${course.slug}/aula/${course.nextLesson.id}`} className="btn btn-light btn-lg">
                <IconPlay className="w-6 h-6" /> {pct > 0 && pct < 100 ? "Continuar" : pct === 100 ? "Rever" : "Assistir"}
              </Link>
            )}
            {course.status === "paid_locked" &&
              (course.checkout_url ? (
                <a href={course.checkout_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
                  <IconLock className="w-5 h-5" /> Desbloquear curso
                </a>
              ) : (
                <span className="btn btn-secondary btn-lg"><IconLock className="w-5 h-5" /> Bloqueado</span>
              ))}
            {course.status === "free_locked" && (
              <form action={requestAccess}>
                <input type="hidden" name="course_id" value={course.id} />
                <SubmitButton variant="primary" className="btn-lg" pendingText="Enviando...">Solicitar acesso gratuito</SubmitButton>
              </form>
            )}
            {course.status === "pending" && <span className="btn btn-secondary btn-lg cursor-default">⏳ Solicitação em análise</span>}
            {showInfo && (
              <Link href={`/cursos/${course.slug}`} className="btn btn-secondary btn-lg backdrop-blur">
                <IconInfo className="w-6 h-6" /> Mais informações
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
