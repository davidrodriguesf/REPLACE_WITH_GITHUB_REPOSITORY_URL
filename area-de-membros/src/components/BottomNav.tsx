"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCalendar, IconCatalog, IconDots, IconHome, IconRoute } from "./Icons";
import { openMenu } from "./MenuSheet";

export const NAV = [
  { href: "/inicio", label: "Início", icon: IconHome },
  { href: "/catalogo", label: "Catálogo", icon: IconCatalog },
  { href: "/trilhas", label: "Trilhas", icon: IconRoute },
  { href: "/agenda", label: "Agenda", icon: IconCalendar },
];

const isActive = (path: string, href: string) => path === href || path.startsWith(href + "/") || (href === "/catalogo" && path.startsWith("/cursos"));

/** Menu inferior flutuante (celular). */
export function BottomNav() {
  const path = usePathname();
  // Telas "imersivas" (curso, aula, prova, perfil) têm botões próprios no rodapé
  if (path.startsWith("/cursos/") || path.startsWith("/perfil")) return null;
  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-end gap-2 pointer-events-none">
      <nav className="pointer-events-auto flex-1 grid grid-cols-4 rounded-full bg-slate-500/70 backdrop-blur-xl p-1.5 shadow-xl shadow-navy-950/20">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(path, href);
          return (
            <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 rounded-full py-2 text-[12px] font-semibold text-white transition ${active ? "bg-white/25" : "opacity-85"}`}>
              <Icon className="w-6 h-6" />
              {label}
            </Link>
          );
        })}
      </nav>
      <button type="button" onClick={openMenu} aria-label="Mais opções" className="pointer-events-auto grid h-[68px] w-[68px] place-items-center rounded-full bg-slate-500/70 backdrop-blur-xl text-white shadow-xl shadow-navy-950/20 cursor-pointer">
        <IconDots className="w-8 h-8" />
      </button>
    </div>
  );
}

/** Links do topo (computador). */
export function TopNav() {
  const path = usePathname();
  return (
    <nav className="hidden md:flex items-center gap-1">
      {[...NAV, { href: "/comunidade", label: "Comunidade" }, { href: "/desenvolvimento", label: "Desenvolvimento" }].map(({ href, label }) => (
        <Link key={href} href={href} className={`rounded-full px-4 py-2 text-[15px] font-semibold transition ${isActive(path, href) ? "bg-white/15 text-white" : "text-white/70 hover:text-white"}`}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
