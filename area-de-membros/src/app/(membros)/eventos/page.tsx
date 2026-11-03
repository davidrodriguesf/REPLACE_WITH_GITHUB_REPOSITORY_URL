import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { RsvpButton } from "@/components/RsvpButton";
import { formatDate, formatDateTime, TIMEZONE } from "@/lib/utils";
import type { EventItem } from "@/lib/types";

export const metadata = { title: "Eventos" };

type Row = EventItem & { event_rsvps: { count: number }[] };

function DateBadge({ iso }: { iso: string }) {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, day: "2-digit" }).format(d);
  const month = new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, month: "short" }).format(d).replace(".", "");
  return (
    <div className="w-16 shrink-0 rounded-xl bg-brand-50 text-brand-700 text-center py-2">
      <p className="text-2xl font-bold leading-none">{day}</p>
      <p className="text-xs uppercase font-semibold mt-1">{month}</p>
    </div>
  );
}

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
    <div className="space-y-8">
      <div>
        <h1 className="h-page">Eventos</h1>
        <p className="text-muted mt-1">Lives, mentorias e encontros da comunidade.</p>
      </div>
      <section className="space-y-4">
        {((upcoming ?? []) as Row[]).map((e) => (
          <article key={e.id} className="card p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
            <DateBadge iso={e.starts_at} />
            <div className="flex-1 min-w-0">
              <Link href={`/eventos/${e.id}`} className="font-semibold text-lg hover:text-brand-700">{e.title}</Link>
              <p className="text-sm text-muted">{formatDateTime(e.starts_at)} · {e.location || "Online"}</p>
              {e.description && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{e.description}</p>}
              <p className="text-xs text-muted mt-2">{e.event_rsvps[0]?.count ?? 0} confirmado{(e.event_rsvps[0]?.count ?? 0) === 1 ? "" : "s"}</p>
            </div>
            <div className="sm:self-center"><RsvpButton eventId={e.id} going={going.has(e.id)} /></div>
          </article>
        ))}
        {!upcoming?.length && <p className="card p-8 text-center text-muted">Nenhum evento agendado no momento.</p>}
      </section>
      {!!past?.length && (
        <section>
          <h2 className="h-section mb-3">Eventos anteriores</h2>
          <ul className="card divide-y divide-slate-100">
            {(past as EventItem[]).map((e) => (
              <li key={e.id}>
                <Link href={`/eventos/${e.id}`} className="flex justify-between gap-4 px-5 py-3 hover:bg-slate-50">
                  <span className="font-medium">{e.title}</span>
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
