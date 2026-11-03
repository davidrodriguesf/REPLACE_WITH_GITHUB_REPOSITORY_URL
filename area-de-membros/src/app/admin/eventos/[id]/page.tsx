import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { deleteEvent } from "../../actions";
import { ConfirmButton } from "@/components/ui";
import { isoToLocalInput } from "@/lib/utils";
import type { EventItem } from "@/lib/types";
import { EventForm } from "../EventForm";

export default async function AdminEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: event } = await supabase.from("events").select("*").eq("id", id).maybeSingle<EventItem>();
  if (!event) notFound();
  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/admin/eventos" className="link text-sm">← Eventos</Link>
      <div className="flex items-center justify-between gap-3">
        <h1 className="h-page">Editar evento</h1>
        <div className="flex gap-2">
          <Link href={`/eventos/${event.id}`} className="btn btn-secondary">Ver página</Link>
          <form action={deleteEvent}>
            <input type="hidden" name="id" value={event.id} />
            <ConfirmButton message="Excluir este evento?">Excluir</ConfirmButton>
          </form>
        </div>
      </div>
      <EventForm event={event} startsLocal={isoToLocalInput(event.starts_at)} endsLocal={isoToLocalInput(event.ends_at)} />
    </div>
  );
}
