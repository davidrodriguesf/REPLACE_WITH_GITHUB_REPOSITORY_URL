import { AppShell } from "@/components/AppShell";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "./AdminNav";

export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, supabase } = await requireAdmin();
  const { count } = await supabase.from("access_requests").select("*", { count: "exact", head: true }).eq("status", "pending");
  return (
    <AppShell profile={profile}>
      <AdminNav pending={count ?? 0} />
      {children}
    </AppShell>
  );
}
