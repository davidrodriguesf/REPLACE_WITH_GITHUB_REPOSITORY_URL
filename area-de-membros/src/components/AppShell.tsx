import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import type { Profile } from "@/lib/types";
import { SITE_NAME } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { IconLogout } from "./Icons";
import { NavLinks } from "./NavLinks";

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const isAdmin = profile.role === "admin";
  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="font-bold text-lg text-brand-700 truncate">{SITE_NAME}</Link>
          <NavLinks isAdmin={isAdmin} />
          <div className="flex items-center gap-2">
            <Link href="/perfil" className="flex items-center gap-2">
              <Avatar name={profile.full_name} url={profile.avatar_url} size={34} />
            </Link>
            <form action={logout}>
              <button className="btn btn-ghost" title="Sair" aria-label="Sair"><IconLogout /></button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
      <NavLinks isAdmin={isAdmin} mobile />
    </div>
  );
}
