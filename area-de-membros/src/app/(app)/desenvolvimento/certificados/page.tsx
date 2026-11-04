import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { EmptyState } from "@/components/Cards";
import { IconAward, IconChevronLeft } from "@/components/Icons";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Certificados" };

export default async function Certificados() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("certificates").select("id, code, hours, issued_at, courses(title)").eq("user_id", user.id).order("issued_at", { ascending: false });
  const list = (data ?? []) as unknown as { id: string; code: string; hours: number | null; issued_at: string; courses: { title: string } | null }[];
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/desenvolvimento" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-navy-900"><IconChevronLeft className="w-4 h-4" />Meu desenvolvimento</Link>
      <h1 className="h-page">Certificados</h1>
      {list.length ? (
        <ul className="space-y-3">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={`/certificados/${c.id}`} className="flex items-center gap-4 rounded-2xl border border-slate-200 p-5 hover:shadow-md">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700"><IconAward className="w-7 h-7" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold text-navy-950">{c.courses?.title}</span>
                  <span className="text-sm text-slate-500">Emitido em {formatDate(c.issued_at)}{c.hours ? ` · ${c.hours}h` : ""} · código {c.code}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<IconAward className="w-14 h-14" />} title="Nenhum certificado ainda" text="Conclua todas as aulas de um curso (e seja aprovado na prova, quando houver) para receber o certificado." />
      )}
    </div>
  );
}
