import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getLearning } from "@/lib/learning";
import { getPlans, getStats, planStatusLabel } from "@/lib/development";
import { EmptyState, ProgressBar, Segmented } from "@/components/Cards";
import { IconAward, IconChevronRight, IconClipboard } from "@/components/Icons";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Meu desenvolvimento" };

export default async function Desenvolvimento({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const { filtro = "todos" } = await searchParams;
  const { supabase, user } = await requireUser();
  const [plans, stats, { courses }] = await Promise.all([getPlans(supabase, user.id), getStats(supabase, user.id), getLearning(supabase, user.id)]);
  const shown = plans.filter((p) => (filtro === "andamento" ? p.status === "active" : filtro === "concluidos" ? p.status === "completed" : p.status !== "cancelled"));
  const completedCourses = courses.filter((c) => c.completed).length;

  const tiles = [
    { label: "Cursos concluídos", value: completedCourses },
    { label: "Horas de estudo", value: `${stats.hours}h` },
    { label: "Certificados", value: stats.certificates, href: "/desenvolvimento/certificados" },
    { label: "Média nas provas", value: stats.examAvg === null ? "—" : `${stats.examAvg}%` },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="h-page">Meu desenvolvimento</h1>
        <p className="mt-2 text-slate-500">Seu plano de desenvolvimento, conquistas e evolução.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => {
          const inner = (
            <>
              <p className="text-3xl font-extrabold tracking-tight text-navy-950 tabular-nums">{t.value}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">{t.label}</p>
            </>
          );
          return t.href ? (
            <Link key={t.label} href={t.href} className="rounded-2xl bg-slate-50 p-5 hover:bg-slate-100">{inner}</Link>
          ) : (
            <div key={t.label} className="rounded-2xl bg-slate-50 p-5">{inner}</div>
          );
        })}
      </div>

      <section className="space-y-5">
        <h2 className="h-row">Planos de desenvolvimento (PDI)</h2>
        <Segmented
          active={filtro}
          items={[
            { key: "todos", label: "Todos", href: "/desenvolvimento" },
            { key: "andamento", label: "Em andamento", href: "/desenvolvimento?filtro=andamento" },
            { key: "concluidos", label: "Concluídos", href: "/desenvolvimento?filtro=concluidos" },
          ]}
        />
        {shown.length ? (
          <div className="space-y-3">
            {shown.map((p) => (
              <Link key={p.id} href={`/desenvolvimento/pdi/${p.id}`} className="block rounded-2xl border border-slate-200 p-5 transition hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-navy-950">{p.title}</p>
                    <p className="text-sm text-slate-500">
                      {planStatusLabel[p.status]}{p.due_date ? ` · até ${formatDate(p.due_date)}` : ""} · {p.doneGoals} de {p.goals.length} metas
                    </p>
                  </div>
                  <IconChevronRight className="w-5 h-5 shrink-0 text-slate-400" />
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <ProgressBar pct={p.pct} className="flex-1" />
                  <span className="font-semibold tabular-nums text-slate-600">{p.pct}%</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<IconClipboard className="w-14 h-14" />}
            title="Nenhum plano atribuído"
            text="Quando seu gestor atribuir um plano de desenvolvimento a você, ele aparecerá aqui."
          />
        )}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="h-row">Certificados</h2>
          <Link href="/desenvolvimento/certificados" className="link text-sm">Ver todos</Link>
        </div>
        {courses.filter((c) => c.certificateId).length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {courses.filter((c) => c.certificateId).slice(0, 4).map((c) => (
              <Link key={c.id} href={`/certificados/${c.certificateId}`} className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 hover:shadow-md">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700"><IconAward /></span>
                <span className="min-w-0"><span className="block font-bold text-navy-950 truncate">{c.title}</span><span className="text-sm text-slate-500">Certificado de conclusão</span></span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-slate-50 p-5 text-slate-500">Conclua um curso (e a prova, quando houver) para ganhar seu primeiro certificado.</p>
        )}
      </section>
    </div>
  );
}
