import Link from "next/link";
import type { Profile } from "@/lib/types";
import { SITE_NAME } from "@/lib/utils";
import { getBranding } from "@/lib/company";
import { Avatar } from "./Avatar";
import { BottomNav, TopNav } from "./BottomNav";
import { IconMenu } from "./Icons";
import { MenuSheet, MenuTrigger } from "./MenuSheet";

const LOGO = process.env.NEXT_PUBLIC_LOGO_URL;

export function AppLogo({ size = 44 }: { size?: number }) {
  return LOGO ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={LOGO} alt="" width={size} height={size} className="rounded-xl object-cover bg-brand-700" style={{ width: size, height: size }} />
  ) : (
    <span className="grid place-items-center rounded-xl bg-brand-600 text-white font-extrabold" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {SITE_NAME.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
    </span>
  );
}

export async function AppShell({ profile, jobRole, children }: { profile: Profile; jobRole: string | null; children: React.ReactNode }) {
  const company = await getBranding(profile.company_id);
  return (
    <div className="min-h-dvh pb-32 md:pb-12">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white text-navy-950 pt-[env(safe-area-inset-top)]">
        <div className="container-app h-[72px] flex items-center gap-4">
          <Link href="/inicio" className="flex items-center gap-3 min-w-0">
            {company?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo_url} alt="" className="h-11 w-11 rounded-xl border border-slate-200 bg-white object-contain" />
            ) : (
              <AppLogo />
            )}
            <span className="min-w-0">
              <span className="block text-lg sm:text-xl font-bold leading-tight tracking-tight truncate">{SITE_NAME}</span>
              {company && <span className="block text-xs font-semibold text-slate-500 truncate">{company.name}</span>}
            </span>
          </Link>
          <div className="flex-1 flex justify-center"><TopNav /></div>
          <MenuTrigger className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1.5 pl-4 text-navy-800 hover:bg-slate-50 transition cursor-pointer shrink-0">
            <IconMenu className="w-6 h-6 mr-2" />
            <span className="relative">
              <Avatar name={profile.full_name} url={profile.avatar_url} size={38} dark />
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            </span>
          </MenuTrigger>
        </div>
      </header>
      <main className="container-app pt-6 sm:pt-8">{children}</main>
      <BottomNav />
      <MenuSheet name={profile.full_name} avatarUrl={profile.avatar_url} jobRole={jobRole} role={profile.role} supportUrl={process.env.NEXT_PUBLIC_SUPPORT_URL} />
    </div>
  );
}
