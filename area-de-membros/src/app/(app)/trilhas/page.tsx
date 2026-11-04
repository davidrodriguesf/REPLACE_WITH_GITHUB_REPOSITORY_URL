import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getLearning, getTrails } from "@/lib/learning";
import { EmptyState, ProgressBar } from "@/components/Cards";
import { HomeTabs } from "@/components/HomeTabs";
import { IconChevronRight, IconRoute } from "@/components/Icons";

export const metadata = { title: "Trilhas" };

export default async function Trilhas() {
  const { supabase, user } = await requireUser();
  const { byId } = await getLearning(supabase, user.id);
  const trails = await getTrails(supabase, byId);

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div>
          <h1 className="h-page">Trilhas de estudo</h1>
          <p className="mt-2 text-slate-500">O caminho de desenvolvimento definido para a sua função.</p>
        </div>
        <HomeTabs active="/trilhas" />
      </div>
      {trails.length ? (
        <div className="grid gap-5 md:grid-cols-2">
          {trails.map((t) => (
            <Link key={t.id} href={`/trilhas/${t.id}`} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white transition hover:shadow-lg hover:shadow-navy-950/5">
              <div className="relative h-36 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500">
                {t.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
                )}
                <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                  {t.roleNames.length > 0 && <p className="text-sm font-semibold text-brand-100">{t.roleNames.join(" · ")}</p>}
                  <h2 className="text-2xl font-bold leading-tight">{t.title}</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {t.description && <p className="text-slate-600 line-clamp-2">{t.description}</p>}
                <div className="flex items-center gap-4">
                  <ProgressBar pct={t.pct} className="flex-1" />
                  <span className="font-semibold tabular-nums text-slate-600">{t.pct}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{t.doneCount} de {t.steps.length} cursos</span>
                  <span className="flex items-center gap-1 font-semibold text-navy-900">{t.next ? "Continuar" : "Rever"}<IconChevronRight className="w-4 h-4" /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={<IconRoute className="w-14 h-14" />} title="Nenhuma trilha para a sua função" text="Quando o RH vincular uma trilha à sua função, ela aparecerá aqui." />
      )}
    </div>
  );
}
