import Link from "next/link";
import type { CatalogCourse } from "@/lib/catalog";
import { IconGift, IconLock } from "./Icons";

export function CourseCard({ course }: { course: CatalogCourse }) {
  const locked = course.status !== "enrolled";
  const pct = course.totalLessons ? Math.round((course.doneLessons / course.totalLessons) * 100) : 0;
  return (
    <Link href={`/cursos/${course.slug}`} className="card overflow-hidden group flex flex-col hover:shadow-md transition">
      <div className="relative aspect-video bg-gradient-to-br from-brand-600 to-fuchsia-500">
        {course.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.cover_url} alt="" className={`absolute inset-0 w-full h-full object-cover ${locked ? "grayscale opacity-60" : ""}`} />
        )}
        {!course.cover_url && <span className="absolute inset-0 grid place-items-center text-white/90 font-bold text-lg px-4 text-center">{course.title}</span>}
        {locked && (
          <span className="absolute inset-0 grid place-items-center bg-slate-900/40">
            <span className="rounded-full bg-white/95 p-3 text-slate-800 shadow"><IconLock className="w-6 h-6" /></span>
          </span>
        )}
        {course.access_type === "free" && (
          <span className="badge absolute top-3 left-3 bg-emerald-500 text-white"><IconGift className="w-3.5 h-3.5" />Gratuito</span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="font-semibold text-slate-900 group-hover:text-brand-700">{course.title}</h3>
        {course.subtitle && <p className="text-sm text-muted line-clamp-2">{course.subtitle}</p>}
        <div className="mt-auto pt-2">
          {course.status === "enrolled" && (
            <>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-brand-600" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-muted mt-1">{pct}% concluído · {course.totalLessons} aulas</p>
            </>
          )}
          {course.status === "pending" && <span className="badge bg-amber-100 text-amber-800">Solicitação em análise</span>}
          {course.status === "free_locked" && <span className="badge bg-emerald-100 text-emerald-800">Solicitar acesso gratuito</span>}
          {course.status === "paid_locked" && <span className="badge bg-slate-100 text-slate-700">Bloqueado · Saiba mais</span>}
        </div>
      </div>
    </Link>
  );
}
