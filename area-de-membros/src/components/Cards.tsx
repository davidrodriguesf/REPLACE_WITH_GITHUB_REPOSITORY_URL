import Link from "next/link";
import type { LearnCourse } from "@/lib/learning";
import { formatDate } from "@/lib/utils";
import { IconPlay } from "./Icons";

const PANELS = ["from-navy-800 to-navy-950", "from-[#1f4e5f] to-[#0e2a33]", "from-[#5b2333] to-[#2a0f18]", "from-[#2f4f3a] to-[#14261b]", "from-[#4a3b2a] to-[#211a12]", "from-[#2d3a63] to-[#141b33]"];
function panelFor(title: string) {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return PANELS[h % PANELS.length]!;
}

/** Capa do curso. Sem imagem, gera uma capa tipográfica clara. */
export function Cover({ title, subtitle, url, className = "", rounded = "rounded-2xl" }: { title: string; subtitle?: string | null; url: string | null; className?: string; rounded?: string }) {
  return (
    <div className={`relative aspect-video overflow-hidden ${rounded} bg-[#f1efeb] ${className}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex">
          <div className={`w-[38%] bg-gradient-to-br ${panelFor(title)}`} />
          <div className="w-1.5 bg-gold-600" />
          <div className="flex-1 p-[6%] flex flex-col justify-center">
            <p className="font-serif uppercase tracking-wide text-navy-900 leading-[1.05] text-[clamp(14px,2.2vw,26px)] line-clamp-4">{title}</p>
            {subtitle && <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.15em] text-navy-700/80 line-clamp-1">{subtitle}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProgressBar({ pct, className = "" }: { pct: number; className?: string }) {
  return (
    <div className={`h-2 rounded-full bg-slate-200 overflow-hidden ${className}`}>
      <div className="h-full rounded-full bg-gradient-to-r from-navy-950 to-navy-700" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

const instructorsLabel = (c: LearnCourse) => c.instructors.map((i) => i.name).join(" · ") || c.categoryName || null;

/** Card do catálogo: capa + "N aulas". */
export function CourseCard({ course, className = "", showTitle = true }: { course: LearnCourse; className?: string; showTitle?: boolean }) {
  return (
    <Link href={`/cursos/${course.slug}`} className={`group block ${className}`}>
      <div className="relative transition group-hover:-translate-y-0.5">
        <Cover title={course.title} subtitle={instructorsLabel(course)} url={course.cover_url} className="shadow-sm group-hover:shadow-md" />
        {course.totalLessons > 0 && (
          <span className="absolute bottom-3 right-3 rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-navy-900 shadow-sm">{course.totalLessons} aulas</span>
        )}
        {course.dueDate && !course.completed && (
          <span className="absolute top-3 left-3 rounded-lg bg-gold-500 px-2.5 py-1 text-xs font-bold text-white">Até {formatDate(course.dueDate, { day: "2-digit", month: "2-digit", year: undefined })}</span>
        )}
        {course.completed && <span className="absolute top-3 left-3 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">Concluído</span>}
      </div>
      {showTitle && (
        <div className="mt-2.5 px-0.5">
          <p className="font-bold text-navy-950 leading-snug line-clamp-1">{course.title}</p>
          {instructorsLabel(course) && <p className="text-sm text-slate-500 line-clamp-1">{instructorsLabel(course)}</p>}
        </div>
      )}
    </Link>
  );
}

/** Card de "Continuar estudando": capa + barra de progresso. */
export function ContinueCard({ course, className = "" }: { course: LearnCourse; className?: string }) {
  const href = course.nextLesson ? `/cursos/${course.slug}/aula/${course.nextLesson.id}` : `/cursos/${course.slug}`;
  return (
    <Link href={href} className={`group block rounded-2xl border border-slate-200 bg-white overflow-hidden ${className}`}>
      <div className="relative">
        <Cover title={course.title} subtitle={instructorsLabel(course)} url={course.cover_url} rounded="rounded-none" />
        <span className="absolute bottom-3 right-3 grid h-12 w-12 place-items-center rounded-full bg-white/85 text-navy-900 shadow transition group-hover:scale-110">
          <IconPlay className="w-6 h-6" />
        </span>
      </div>
      <div className="flex items-center gap-4 px-4 py-4">
        <ProgressBar pct={course.pct} className="flex-1" />
        <span className="text-[15px] font-semibold text-slate-600 tabular-nums">{course.pct}%</span>
      </div>
    </Link>
  );
}

/** Item do Top 10 com número vazado. */
export function TopCard({ course, rank, className = "" }: { course: LearnCourse; rank: number; className?: string }) {
  return (
    <Link href={`/cursos/${course.slug}`} className={`group flex items-end ${className}`}>
      <span className="outline-number relative z-10 text-[170px] sm:text-[200px] -mr-5 sm:-mr-6 select-none [paint-order:stroke]" aria-hidden>{rank}</span>
      <div className="relative flex-1 min-w-0 transition group-hover:-translate-y-0.5">
        <Cover title={course.title} subtitle={instructorsLabel(course)} url={course.cover_url} className="shadow-sm" />
        {course.totalLessons > 0 && (
          <span className="absolute bottom-3 right-3 rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-navy-900 shadow-sm">{course.totalLessons} aulas</span>
        )}
      </div>
    </Link>
  );
}

/** Fileira com rolagem horizontal (sem JS). */
export function Row({ title, action, children, className = "" }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="h-row">{title}</h2>
        {action}
      </div>
      <div className="no-scrollbar -mx-4 sm:-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:px-6 scroll-px-4 sm:scroll-px-6 pb-2">{children}</div>
    </section>
  );
}

export const rowItem = "snap-start shrink-0 w-[78%] sm:w-[46%] lg:w-[31%]";
export const rowItemWide = "snap-start shrink-0 w-[86%] sm:w-[56%] lg:w-[40%]";

export function EmptyState({ icon, title, text, action }: { icon?: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="py-14 text-center flex flex-col items-center gap-2">
      {icon && <div className="text-slate-400 mb-2">{icon}</div>}
      <p className="text-lg font-bold text-navy-950">{title}</p>
      {text && <p className="max-w-sm text-slate-500">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Segmented({ items, active }: { items: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <div className="seg">
      {items.map((i) => (
        <Link key={i.key} href={i.href} className={`seg-item ${i.key === active ? "seg-active" : ""}`}>{i.label}</Link>
      ))}
    </div>
  );
}
