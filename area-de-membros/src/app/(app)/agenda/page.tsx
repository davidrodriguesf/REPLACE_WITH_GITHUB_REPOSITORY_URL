import { requireUser } from "@/lib/auth";
import { EventCard } from "@/components/EventCard";
import { EmptyState, Segmented } from "@/components/Cards";
import { RsvpButton } from "@/components/RsvpButton";
import { IconCalendar, IconSearch } from "@/components/Icons";
import { TIMEZONE } from "@/lib/utils";
import type { EventItem } from "@/lib/types";

export const metadata = { title: "Agenda" };

export default async function Agenda({ searchParams }: { searchParams: Promise<{ q?: string; aba?: string }> }) {
  const { q = "", aba = "proximos" } = await searchParams;
  const { supabase, user } = await requireUser();
  const nowIso = new Date(Date.now() - 2 * 3600e3).toISOString();
  let query = supabase.from("events").select("*").eq("is_published", true);
  query = aba === "anteriores" ? query.lt("starts_at", nowIso).order("starts_at", { ascending: false }).limit(50) : query.gte("starts_at", nowIso).order("starts_at");
  const term = q.replace(/[%,()]/g, "").trim();
  if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,host.ilike.%${term}%`);
  const [{ data }, { data: mine }] = await Promise.all([query, supabase.from("event_rsvps").select("event_id").eq("user_id", user.id)]);
  const events = (data ?? []) as EventItem[];
  const going = new Set((mine ?? []).map((r) => r.event_id as string));

  const groups = new Map<string, EventItem[]>();
  for (const e of events) {
    const k = new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, month: "long", year: "numeric" }).format(new Date(e.starts_at));
    const label = k.charAt(0).toUpperCase() + k.slice(1).replace(" de ", " ");
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(e);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-page">Eventos</h1>
        <p className="mt-2 text-[17px] text-slate-500">Organize sua agenda e aproveite ao máximo os encontros da empresa.</p>
      </div>
      <form className="relative">
        <IconSearch className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
        {aba !== "proximos" && <input type="hidden" name="aba" value={aba} />}
        <input name="q" defaultValue={q} placeholder="Buscar" className="input rounded-full pl-14 py-4 text-[17px]" />
      </form>
      <Segmented
        active={aba}
        items={[
          { key: "proximos", label: "Próximos", href: `/agenda${q ? `?q=${encodeURIComponent(q)}` : ""}` },
          { key: "anteriores", label: "Anteriores", href: `/agenda?aba=anteriores${q ? `&q=${encodeURIComponent(q)}` : ""}` },
        ]}
      />
      {[...groups.entries()].map(([month, list]) => (
        <section key={month} className="space-y-4">
          <h2 className="text-2xl font-bold text-navy-950">{month}</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {list.map((e) => (
              <EventCard key={e.id} event={e}>
                {aba === "proximos" && <RsvpButton eventId={e.id} going={going.has(e.id)} className="w-full" />}
              </EventCard>
            ))}
          </div>
        </section>
      ))}
      {!events.length && <EmptyState icon={<IconCalendar className="w-14 h-14" />} title={aba === "anteriores" ? "Nenhum evento anterior" : "Nenhum evento agendado"} text="Lives, treinamentos e encontros aparecem aqui." />}
    </div>
  );
}
