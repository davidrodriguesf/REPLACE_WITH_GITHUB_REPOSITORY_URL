import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import type { Profile } from "@/lib/types";
import { SITE_NAME } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { HeaderBar } from "./HeaderBar";
import { IconLogout } from "./Icons";
import { NavLinks } from "./NavLinks";

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const isAdmin = profile.role === "admin";
  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <HeaderBar>
        <div className="gutter h-16 flex items-center gap-6 lg:gap-10">
          <Link href="/dashboard" className="font-black text-xl sm:text-2xl uppercase tracking-tight text-brand-600 truncate shrink-0">
            {SITE_NAME}
          </Link>
          <NavLinks isAdmin={isAdmin} />
          <div className="ml-auto flex items-center gap-1">
            <Link href="/perfil" aria-label="Meu perfil" className="rounded-md ring-2 ring-transparent hover:ring-white/60 transition">
              <Avatar name={profile.full_name} url={profile.avatar_url} size={34} square />
            </Link>
            <form action={logout}>
              <button className="btn btn-ghost" title="Sair" aria-label="Sair"><IconLogout /></button>
            </form>
          </div>
        </div>
      </HeaderBar>
      <main className="gutter pt-20 sm:pt-24 pb-12">{children}</main>
      <NavLinks isAdmin={isAdmin} mobile />
    </div>
  );
}
