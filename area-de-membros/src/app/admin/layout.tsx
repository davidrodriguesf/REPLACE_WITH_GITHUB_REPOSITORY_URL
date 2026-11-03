import { AppShell } from "@/components/AppShell";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "./AdminNav";

export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, supabase } = await requireAdmin();
  const { data: jr } = profile.job_role_id ? await supabase.from("job_roles").select("name").eq("id", profile.job_role_id).maybeSingle() : { data: null };
  return (
    <AppShell profile={profile} jobRole={(jr?.name as string | undefined) ?? "Administrador(a)"}>
      <p className="mb-3 text-sm font-bold uppercase tracking-wider text-gold-600">Painel administrativo</p>
      <AdminNav />
      {children}
    </AppShell>
  );
}
