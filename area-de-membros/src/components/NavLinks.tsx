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

  if (mobile) {
    return (
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 grid pb-[env(safe-area-inset-bottom)]" style={{ gridTemplateColumns: `repeat(${list.length}, 1fr)` }}>
        {list.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "text-brand-700 font-semibold" : "text-slate-500"}`}>
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="hidden md:flex items-center gap-1">
      {list.map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
