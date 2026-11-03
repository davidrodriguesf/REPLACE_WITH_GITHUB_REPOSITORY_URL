import Link from "next/link";
import { notFound } from "next/navigation";
import { requireManager } from "@/lib/auth";
import { MemberDetail } from "@/components/MemberDetail";
import { IconChevronLeft } from "@/components/Icons";
import type { Profile } from "@/lib/types";

export default async function EquipeMembro({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireManager();
  const { data: member } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  if (!member) notFound(); // RLS: gestor só enxerga a própria equipe
  const { data: jr } = member.job_role_id ? await supabase.from("job_roles").select("name").eq("id", member.job_role_id).maybeSingle() : { data: null };
  return (
    <div className="space-y-6">
      <Link href={profile.role === "admin" ? "/admin/colaboradores" : "/equipe"} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-navy-900"><IconChevronLeft className="w-4 h-4" />Voltar</Link>
      <MemberDetail supabase={supabase} member={member} jobRole={(jr?.name as string | undefined) ?? null} />
    </div>
  );
}
