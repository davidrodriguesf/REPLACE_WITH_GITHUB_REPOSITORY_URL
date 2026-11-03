import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { EmptyState } from "@/components/Cards";
import { HomeTabs } from "@/components/HomeTabs";
import { IconLibrary } from "@/components/Icons";
import type { LibraryItem } from "@/lib/types";

export const metadata = { title: "Biblioteca" };

export default async function Biblioteca({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat = "" } = await searchParams;
  const { supabase, profile } = await requireUser();
  const { data } = await supabase.from("library_items").select("*").order("position").order("created_at", { ascending: false });
  const items = (data ?? []) as LibraryItem[];
  const cats = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[];
  const shown = cat ? items.filter((i) => i.category === cat) : items;
  const firstName = profile.full_name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-navy-950">Bem-vindo, <span className="font-medium text-slate-500">{firstName}.</span></h1>
        <HomeTabs active="/biblioteca" />
      </div>
      {cats.length > 1 && (
        <div className="no-scrollbar -mx-4 sm:mx-0 flex gap-2 overflow-x-auto px-4 sm:px-0">
          <Link href="/biblioteca" className={`chip ${!cat ? "chip-active" : ""}`}>Todos</Link>
          {cats.map((c) => <Link key={c} href={`/biblioteca?cat=${encodeURIComponent(c)}`} className={`chip ${cat === c ? "chip-active" : ""}`}>{c}</Link>)}
        </div>
      )}
      {shown.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {shown.map((i) => (
            <a key={i.id} href={i.file_url ?? "#"} target="_blank" rel="noopener noreferrer" className="group block">
              <div className="relative aspect-[2/3] overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 to-navy-950 shadow-sm transition group-hover:-translate-y-1 group-hover:shadow-lg">
                {i.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col justify-between p-5 text-white">
                    <p className="text-xs font-bold uppercase tracking-widest text-gold-500">{i.author}</p>
                    <p className="font-serif text-lg sm:text-xl uppercase leading-tight break-words hyphens-auto" lang="pt-BR">{i.title}</p>
                  </div>
                )}
              </div>
              <p className="mt-2 font-bold leading-snug text-navy-950 line-clamp-2">{i.title}</p>
              {i.author && <p className="text-sm text-slate-500">{i.author}</p>}
            </a>
          ))}
        </div>
      ) : (
        <EmptyState icon={<IconLibrary className="w-14 h-14" />} title="Biblioteca vazia" text="E-books, manuais e materiais publicados pelo RH aparecem aqui." />
      )}
    </div>
  );
}
