import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMembersMap } from "@/lib/members";
import { Avatar } from "@/components/Avatar";
import { RsvpButton } from "@/components/RsvpButton";
import { eventTime, isLive } from "@/components/EventCard";
import { IconCalendar, IconChevronLeft, IconHourglass } from "@/components/Icons";
import { formatDate, googleCalendarUrl } from "@/lib/utils";
import type { EventItem } from "@/lib/types";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const { data: event } = await supabase.from("events").select("*").eq("id", id).maybeSingle<EventItem>();
  if (!event) notFound();
  const { data: rsvps } = await supabase.from("event_rsvps").select("user_id").eq("event_id", id).order("created_at");
  const ids = (rsvps ?? []).map((r) => r.user_id as string);
  const members = await getMembersMap(supabase, ids);
  const going = ids.includes(user.id);
  const past = new Date(event.ends_at ?? event.starts_at).getTime() < Date.now();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/agenda" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-navy-900"><IconChevronLeft className="w-4 h-4" />Agenda</Link>
      <div className="overflow-hidden rounded-3xl border border-slate-200">
        <div className="relative aspect-[16/8] bg-gradient-to-br from-navy-800 to-navy-950">
          {event.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          {isLive(event) && <span className="absolute left-4 top-4 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">● AO VIVO</span>}
        </div>
        <div className="space-y-5 p-6">
          {event.host && <p className="text-sm font-bold uppercase tracking-wider text-gold-600">{event.host}</p>}
          <h1 className="text-3xl font-bold leading-tight text-navy-950">{event.title}</h1>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-4"><span className="icon-box"><IconCalendar className="w-6 h-6 text-slate-500" /></span><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Data</p><p className="text-[17px]">{formatDate(event.starts_at, { weekday: "long", day: "2-digit", month: "long" })}</p></div></div>
            <div className="flex items-center gap-4"><span className="icon-box"><IconHourglass className="w-6 h-6 text-slate-500" /></span><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Horário</p><p className="text-[17px]">{eventTime(event)} · {event.location || "Online"}</p></div></div>
          </div>
          {event.description && <p className="prose-lite text-[17px]">{event.description}</p>}
          <div className="flex flex-wrap gap-3">
            {!past && <RsvpButton eventId={event.id} going={going} />}
            {!past && <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="btn btn-light">Adicionar à agenda</a>}
            {event.meeting_url && <a href={event.meeting_url} target="_blank" rel="noopener noreferrer" className="btn btn-soft">{past ? "Ver gravação" : "Entrar na sala"}</a>}
          </div>
        </div>
      </div>
      <section>
        <h2 className="h-section mb-3">{ids.length} confirmado{ids.length === 1 ? "" : "s"}</h2>
        <div className="flex flex-wrap gap-2">
          {ids.map((uid) => (
            <span key={uid} className="flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-1 pr-3">
              <Avatar name={members.get(uid)?.full_name} url={members.get(uid)?.avatar_url} size={28} />
              <span className="text-sm">{members.get(uid)?.full_name ?? "Colega"}</span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
