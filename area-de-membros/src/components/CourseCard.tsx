import Link from "next/link";
import type { CatalogCourse } from "@/lib/catalog";
import { formatMinutes } from "@/lib/catalog";
import { IconLock, IconPlay } from "./Icons";

export function CourseThumb({ course, locked, className = "" }: { course: Pick<CatalogCourse, "title" | "cover_url">; locked?: boolean; className?: string }) {
  return (
    <div className={`relative aspect-video overflow-hidden bg-gradient-to-br from-brand-600 via-brand-200 to-ink ${className}`}>
      {course.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={course.cover_url} alt="" className={`absolute inset-0 w-full h-full object-cover ${locked ? "grayscale-[60%] brightness-[.55]" : ""}`} />
      ) : (
        <span className="absolute inset-0 grid place-items-center px-4 text-center text-white font-black uppercase tracking-tight text-lg leading-tight">{course.title}</span>
      )}
    </div>
  );
}

export function CourseCard({ course, className = "" }: { course: CatalogCourse; className?: string }) {
  const locked = course.status !== "enrolled";
  const pct = course.totalLessons ? Math.round((course.doneLessons / course.totalLessons) * 100) : 0;
  const href = !locked && course.nextLesson ? `/cursos/${course.slug}/aula/${course.nextLesson.id}` : `/cursos/${course.slug}`;
  const meta = [course.totalLessons ? `${course.totalLessons} aulas` : null, formatMinutes(course.totalMinutes)].filter(Boolean).join(" · ");

  return (
    <Link
      href={href}
      className={`group/card relative block rounded-md bg-surface transition duration-300 hover:z-10 hover:scale-[1.04] hover:shadow-2xl hover:shadow-black/70 focus-visible:outline-2 focus-visible:outline-white ${className}`}
    >
      <div className="relative rounded-t-md overflow-hidden">
        <CourseThumb course={course} locked={locked} />
        {course.access_type === "free" && (
          <span className="badge absolute top-2 left-2 bg-emerald-500 text-white uppercase tracking-wide text-[10px]">Grátis</span>
        )}
        {locked ? (
          <span className="absolute inset-0 grid place-items-center">
            <span className="rounded-full bg-black/60 ring-1 ring-white/40 p-3 text-white"><IconLock className="w-6 h-6" /></span>
          </span>
        ) : (
          <span className="absolute inset-0 grid place-items-center opacity-0 group-hover/card:opacity-100 transition">
            <span className="rounded-full bg-white text-black p-3 shadow-xl"><IconPlay className="w-7 h-7" /></span>
          </span>
        )}
        {!locked && pct > 0 && (
          <span className="absolute bottom-0 inset-x-0 h-1 bg-white/25">
            <span className="block h-full bg-brand-600" style={{ width: `${pct}%` }} />
          </span>
        )}
      </div>
      <div className="px-3 py-2.5">
        <h3 className="font-semibold text-white text-sm leading-snug line-clamp-1">{course.title}</h3>
        <p className="text-xs text-muted mt-0.5 line-clamp-1">
          {course.status === "enrolled" && (pct > 0 ? `${pct}% concluído${course.nextLesson && pct < 100 ? ` · Aula ${course.nextLesson.number}` : ""}` : meta || "Comece agora")}
          {course.status === "pending" && <span className="text-amber-800">Solicitação em análise</span>}
          {course.status === "free_locked" && <span className="text-emerald-700">Gratuito · solicite o acesso</span>}
          {course.status === "paid_locked" && "Desbloqueie este curso"}
        </p>
      </div>
    </Link>
  );
}
