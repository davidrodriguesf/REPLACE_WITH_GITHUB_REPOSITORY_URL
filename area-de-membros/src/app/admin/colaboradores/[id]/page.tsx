import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { resendInvite } from "../../actions";
import { MemberDetail } from "@/components/MemberDetail";
import { SubmitButton } from "@/components/ui";
import { IconChevronLeft } from "@/components/Icons";
import type { Profile } from "@/lib/types";
import { EditEmployeeForm } from "../EmployeeForms";

export default async function Colaborador({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: p } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  if (!p) notFound();
  const [{ data: roles }, { data: managers }] = await Promise.all([
    supabase.from("job_roles").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name").in("role", ["manager", "admin"]).eq("is_active", true).order("full_name"),
  ]);
  const roleOpts = (roles ?? []).map((r) => ({ id: r.id as string, name: r.name as string }));
  const jobRole = roleOpts.find((r) => r.id === p.job_role_id)?.name ?? null;
  return (
    <div className="space-y-8">
      <Link href="/admin/colaboradores" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-navy-900"><IconChevronLeft className="w-4 h-4" />Colaboradores</Link>
      <MemberDetail supabase={supabase} member={p} jobRole={jobRole} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <EditEmployeeForm p={p} roles={roleOpts} managers={(managers ?? []).map((m) => ({ id: m.id as string, name: (m.full_name as string) ?? "" }))} />
        <form action={resendInvite} className="card h-fit p-5 space-y-3">
          <h2 className="h-section">Acesso</h2>
          <p className="text-sm text-slate-500">Reenvia o e-mail com um link para a pessoa criar ou redefinir a senha.</p>
          <input type="hidden" name="email" value={p.email} />
          <SubmitButton variant="secondary" pendingText="Enviando...">Reenviar convite</SubmitButton>
        </form>
      </div>
    </div>
  );
}
