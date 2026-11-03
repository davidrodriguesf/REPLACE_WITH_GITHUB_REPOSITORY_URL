"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBook, IconCalendar, IconHome, IconShield, IconUser, IconUsers } from "./Icons";

const items = [
  { href: "/dashboard", label: "Início", icon: IconHome },
  { href: "/cursos", label: "Cursos", icon: IconBook },
  { href: "/comunidade", label: "Comunidade", icon: IconUsers },
  { href: "/eventos", label: "Eventos", icon: IconCalendar },
  { href: "/perfil", label: "Perfil", icon: IconUser },
];

export function NavLinks({ isAdmin, mobile = false }: { isAdmin: boolean; mobile?: boolean }) {
  const path = usePathname();
  const list = isAdmin ? [...items, { href: "/admin", label: "Admin", icon: IconShield }] : items;
  const isActive = (href: string) => path === href || path.startsWith(href + "/");

  if (mobile) {
    return (
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-ink/95 backdrop-blur border-t border-white/10 grid pb-[env(safe-area-inset-bottom)]"
        style={{ gridTemplateColumns: `repeat(${list.length}, 1fr)` }}
      >
        {list.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive(href) ? "text-white font-semibold" : "text-slate-500"}`}>
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="hidden md:flex items-center gap-5 lg:gap-6">
      {list
        .filter((i) => i.href !== "/perfil")
        .map(({ href, label }) => (
          <Link key={href} href={href} className={`text-sm transition ${isActive(href) ? "text-white font-bold" : "text-slate-600 hover:text-slate-500"}`}>
            {label}
          </Link>
        ))}
    </nav>
  );
}
