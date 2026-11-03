import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { EventCard } from "@/components/EventCard";
import { RsvpButton } from "@/components/RsvpButton";
import { formatDate } from "@/lib/utils";
import type { EventItem } from "@/lib/types";

export const metadata = { title: "Eventos" };

type Row = EventItem & { event_rsvps: { count: number }[] };

export default async function EventsPage() {
  const { supabase, user } = await requireUser();
  const nowIso = new Date().toISOString();
  const [{ data: upcoming }, { data: past }, { data: mine }] = await Promise.all([
    supabase.from("events").select("*, event_rsvps(count)").eq("is_published", true).gte("starts_at", nowIso).order("starts_at"),
    supabase.from("events").select("*").eq("is_published", true).lt("starts_at", nowIso).order("starts_at", { ascending: false }).limit(10),
    supabase.from("event_rsvps").select("event_id").eq("user_id", user.id),
  ]);
  const going = new Set((mine ?? []).map((r) => r.event_id as string));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="h-page">Eventos</h1>
        <p className="text-muted mt-1">Lives, mentorias e encontros da comunidade. Horários de Brasília.</p>
      </div>
      <section>
        <h2 className="h-row mb-3">Próximos</h2>
        {upcoming?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
            {(upcoming as Row[]).map((e) => (
              <div key={e.id} className="space-y-2">
                <EventCard event={e} going={going.has(e.id)} count={e.event_rsvps[0]?.count ?? 0} />
                {e.description && <p className="text-sm text-slate-500 line-clamp-2 px-1">{e.description}</p>}
                <RsvpButton eventId={e.id} going={going.has(e.id)} className="w-full" />
              </div>
            ))}
          </div>
        ) : (
          <p className="card p-8 text-center text-muted">Nenhum evento agendado no momento.</p>
        )}
      </section>
      {!!past?.length && (
        <section>
          <h2 className="h-row mb-3">Eventos anteriores</h2>
          <ul className="rounded-md overflow-hidden divide-y divide-white/5">
            {(past as EventItem[]).map((e) => (
              <li key={e.id}>
                <Link href={`/eventos/${e.id}`} className="flex justify-between gap-4 px-5 py-3 bg-surface hover:bg-surface-2">
                  <span className="font-medium text-white">{e.title}</span>
                  <span className="text-sm text-muted whitespace-nowrap">{formatDate(e.starts_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
