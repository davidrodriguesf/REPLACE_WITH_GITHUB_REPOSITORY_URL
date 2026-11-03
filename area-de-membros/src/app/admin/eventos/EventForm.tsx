"use client";

import { useActionState } from "react";
import { saveEvent } from "../actions";
import { FormMessage, SubmitButton } from "@/components/ui";
import type { EventItem } from "@/lib/types";

export function EventForm({ event, startsLocal, endsLocal }: { event?: EventItem; startsLocal?: string; endsLocal?: string }) {
  const [state, action] = useActionState(saveEvent, undefined);
  return (
    <form action={action} className="card p-5 space-y-4">
      {event && <input type="hidden" name="id" value={event.id} />}
      <div>
        <label className="label">Título *</label>
        <input className="input" name="title" defaultValue={event?.title} required />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Início * (horário de Brasília)</label>
          <input className="input" name="starts_at" type="datetime-local" defaultValue={startsLocal} required />
        </div>
        <div>
          <label className="label">Término</label>
          <input className="input" name="ends_at" type="datetime-local" defaultValue={endsLocal} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Local</label>
          <input className="input" name="location" defaultValue={event?.location ?? ""} placeholder="Online / endereço" />
        </div>
        <div>
          <label className="label">Link da sala (Zoom, Meet, YouTube)</label>
          <input className="input" name="meeting_url" type="url" defaultValue={event?.meeting_url ?? ""} />
        </div>
      </div>
      <div>
        <label className="label">Descrição</label>
        <textarea className="input" name="description" defaultValue={event?.description ?? ""} />
      </div>
      <div>
        <label className="label">URL da capa</label>
        <input className="input" name="cover_url" type="url" defaultValue={event?.cover_url ?? ""} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_published" defaultChecked={event?.is_published ?? true} /> Publicado
      </label>
      <FormMessage state={state} />
      <SubmitButton>{event ? "Salvar evento" : "Criar evento"}</SubmitButton>
    </form>
  );
}
