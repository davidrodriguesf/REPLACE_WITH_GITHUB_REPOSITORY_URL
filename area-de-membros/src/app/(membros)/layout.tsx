import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";

export default async function MembersLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();
  return <AppShell profile={profile}>{children}</AppShell>;
}
