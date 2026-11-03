import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMembersMap } from "@/lib/members";
import { Avatar } from "@/components/Avatar";
import { RsvpButton } from "@/components/RsvpButton";
import { IconCalendar } from "@/components/Icons";
import { formatDateTime, googleCalendarUrl } from "@/lib/utils";
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
  const isPast = new Date(event.ends_at ?? event.starts_at).getTime() < Date.now();

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link href="/eventos" className="link text-sm">← Eventos</Link>
      <article className="card overflow-hidden">
        {event.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.cover_url} alt="" className="w-full aspect-[21/9] object-cover" />
        )}
        <div className="p-5 sm:p-6 space-y-4">
          <h1 className="h-page">{event.title}</h1>
          <div className="text-sm text-slate-600 space-y-1">
            <p className="capitalize">🗓️ {formatDateTime(event.starts_at)}{event.ends_at ? ` até ${formatDateTime(event.ends_at)}` : ""} (horário de Brasília)</p>
            <p>📍 {event.location || "Online"}</p>
          </div>
          {event.description && <p className="prose-lite">{event.description}</p>}
          {!isPast && (
            <div className="flex flex-wrap gap-2 pt-2">
              <RsvpButton eventId={event.id} going={going} />
              <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                <IconCalendar className="w-4 h-4" /> Adicionar à agenda
              </a>
              {event.meeting_url && (
                <a href={event.meeting_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Entrar na sala</a>
              )}
            </div>
          )}
          {isPast && event.meeting_url && (
            <a href={event.meeting_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Ver gravação / link</a>
          )}
        </div>
      </article>
      <section className="card p-5">
        <h2 className="h-section mb-3">{ids.length} confirmado{ids.length === 1 ? "" : "s"}</h2>
        <div className="flex flex-wrap gap-2">
          {ids.map((uid) => (
            <span key={uid} className="flex items-center gap-2 rounded-full bg-slate-50 pr-3">
              <Avatar name={members.get(uid)?.full_name} url={members.get(uid)?.avatar_url} size={28} />
              <span className="text-sm">{members.get(uid)?.full_name ?? "Membro"}</span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
