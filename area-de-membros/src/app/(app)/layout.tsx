import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, supabase } = await requireUser();
  const { data: jr } = profile.job_role_id
    ? await supabase.from("job_roles").select("name").eq("id", profile.job_role_id).maybeSingle()
    : { data: null };
  return (
    <AppShell profile={profile} jobRole={(jr?.name as string | undefined) ?? null}>
      {children}
    </AppShell>
  );
}
