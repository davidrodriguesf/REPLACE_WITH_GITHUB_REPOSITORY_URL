import { requireAdmin } from "@/lib/auth";
import { reviewRequest } from "../actions";
import { SubmitButton } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

type Row = {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
  profiles: { email: string; full_name: string | null } | null;
  courses: { title: string } | null;
};

export default async function AdminRequests({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "pending" } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("access_requests")
    .select("id, status, message, created_at, profiles!access_requests_user_id_fkey(email, full_name), courses(title)")
    .eq("status", status)
    .order("created_at", { ascending: status !== "pending" })
    .limit(200);
  const rows = (data ?? []) as unknown as Row[];
  const tabs = [
    ["pending", "Pendentes"],
    ["approved", "Aprovadas"],
    ["rejected", "Recusadas"],
  ];
  return (
    <div className="space-y-4">
      <div>
        <h1 className="h-section">Solicitações de cursos gratuitos</h1>
        <p className="text-sm text-muted">Alunos pedem acesso aos cursos gratuitos; ao aprovar, o curso é liberado e o aluno recebe um e-mail.</p>
      </div>
      <div className="flex gap-2">
        {tabs.map(([k, label]) => (
          <a key={k} href={`?status=${k}`} className={`btn btn-sm ${status === k ? "btn-primary" : "btn-secondary"}`}>{label}</a>
        ))}
      </div>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium">{r.profiles?.full_name || r.profiles?.email} <span className="text-muted font-normal">→ {r.courses?.title}</span></p>
              <p className="text-xs text-muted">{r.profiles?.email} · {formatDateTime(r.created_at)}</p>
              {r.message && <p className="text-sm mt-2 bg-slate-50 rounded-lg px-3 py-2">“{r.message}”</p>}
            </div>
            {r.status === "pending" && (
              <div className="flex gap-2">
                <form action={reviewRequest}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <SubmitButton variant="secondary" pendingText="...">Recusar</SubmitButton>
                </form>
                <form action={reviewRequest}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <SubmitButton pendingText="Liberando...">Aprovar</SubmitButton>
                </form>
              </div>
            )}
          </div>
        ))}
        {!rows.length && <p className="card p-8 text-center text-muted">Nada por aqui.</p>}
      </div>
    </div>
  );
}
