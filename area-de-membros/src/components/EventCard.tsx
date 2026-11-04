import Link from "next/link";
import type { EventItem } from "@/lib/types";
import { formatDate, TIMEZONE } from "@/lib/utils";
import { IconCalendar, IconHourglass } from "./Icons";

const hm = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export function eventTime(e: Pick<EventItem, "starts_at" | "ends_at">) {
  return e.ends_at ? `${hm(e.starts_at)} - ${hm(e.ends_at)}` : hm(e.starts_at);
}

export function isLive(e: Pick<EventItem, "starts_at" | "ends_at">) {
  const now = Date.now();
  const start = new Date(e.starts_at).getTime();
  const end = e.ends_at ? new Date(e.ends_at).getTime() : start + 60 * 60 * 1000;
  return now >= start && now <= end;
}

export function EventCard({ event, className = "", children }: { event: EventItem; className?: string; children?: React.ReactNode }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${className}`}>
      <Link href={`/agenda/${event.id}`} className="block">
        <div className="relative aspect-[16/9] bg-gradient-to-br from-brand-600 to-brand-900">
          {event.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          {!event.cover_url && (
            <div className="absolute inset-0 flex flex-col justify-end p-5 pt-14 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-200">{event.host || "Evento"}</p>
              <p className="mt-1 font-serif text-xl uppercase leading-tight line-clamp-2">{event.title}</p>
            </div>
          )}
          {isLive(event) && <span className="absolute left-4 top-4 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">● AO VIVO</span>}
        </div>
        <div className="p-5 space-y-4">
          <h3 className="text-xl font-bold leading-snug text-navy-950">{event.title}</h3>
          <div className="flex items-center gap-4">
            <span className="icon-box"><IconCalendar className="w-6 h-6 text-slate-500" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Data</p>
              <p className="text-[17px] text-navy-900">{formatDate(event.starts_at, { day: "2-digit", month: "short", year: "numeric" })}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="icon-box"><IconHourglass className="w-6 h-6 text-slate-500" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Horário</p>
              <p className="text-[17px] text-navy-900">{eventTime(event)}</p>
            </div>
          </div>
        </div>
      </Link>
      {children && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}
