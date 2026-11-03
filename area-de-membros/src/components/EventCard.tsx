import Link from "next/link";
import type { EventItem } from "@/lib/types";
import { TIMEZONE } from "@/lib/utils";

export function EventCard({ event, going, count, className = "" }: { event: EventItem; going?: boolean; count?: number; className?: string }) {
  const d = new Date(event.starts_at);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, ...o }).format(d);
  const soon = d.getTime() - Date.now() < 3 * 86400000;
  return (
    <Link
      href={`/eventos/${event.id}`}
      className={`group/card relative block rounded-md overflow-hidden bg-surface transition duration-300 hover:z-10 hover:scale-[1.04] hover:shadow-2xl hover:shadow-black/70 ${className}`}
    >
      <div className="relative aspect-video bg-gradient-to-br from-brand-200 via-surface-2 to-ink">
        {event.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute top-2 left-2 flex gap-1.5">
          {soon && <span className="badge bg-brand-600 text-white uppercase tracking-wide text-[10px]">● Em breve</span>}
          {going && <span className="badge bg-white text-black text-[10px] uppercase tracking-wide">Confirmado</span>}
        </div>
        <div className="absolute bottom-0 inset-x-0 p-3 flex items-end gap-3">
          <div className="text-center leading-none shrink-0">
            <p className="text-3xl font-black text-white">{f({ day: "2-digit" })}</p>
            <p className="text-[11px] font-bold uppercase text-brand-700 mt-1">{f({ month: "short" }).replace(".", "")}</p>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-sm leading-snug line-clamp-2">{event.title}</h3>
            <p className="text-xs text-slate-600">
              {f({ weekday: "short", hour: "2-digit", minute: "2-digit" })} · {event.location || "Online"}
              {typeof count === "number" ? ` · ${count} confirmado${count === 1 ? "" : "s"}` : ""}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
