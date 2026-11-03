import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import type { EventItem } from "@/lib/types";
import { EventForm } from "./EventForm";

export default async function AdminEvents() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("events").select("*, event_rsvps(count)").order("starts_at", { ascending: false }).limit(100);
  const events = (data ?? []) as (EventItem & { event_rsvps: { count: number }[] })[];
  const now = Date.now();
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_440px]">
      <section>
        <h1 className="h-section mb-4">Eventos</h1>
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Evento</th><th>Data</th><th>Confirmados</th></tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className={new Date(e.starts_at).getTime() < now ? "opacity-60" : ""}>
                  <td>
                    <Link href={`/admin/eventos/${e.id}`} className="link">{e.title}</Link>
                    {!e.is_published && <span className="badge bg-slate-100 text-slate-600 ml-2">Rascunho</span>}
                  </td>
                  <td className="whitespace-nowrap">{formatDateTime(e.starts_at)}</td>
                  <td>{e.event_rsvps[0]?.count ?? 0}</td>
                </tr>
              ))}
              {!events.length && <tr><td colSpan={3} className="text-center text-muted py-6">Nenhum evento.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2 className="h-section mb-4">Novo evento</h2>
        <EventForm />
      </section>
    </div>
  );
}
