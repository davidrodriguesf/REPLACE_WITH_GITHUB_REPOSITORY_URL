"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/cursos", label: "Cursos" },
  { href: "/admin/alunos", label: "Alunos & acessos" },
  { href: "/admin/solicitacoes", label: "Solicitações" },
  { href: "/admin/eventos", label: "Eventos" },
  { href: "/admin/comunidade", label: "Comunidade" },
  { href: "/admin/webhooks", label: "Webhooks" },
];

export function AdminNav({ pending }: { pending: number }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto -mx-4 px-4 pb-2 mb-6 border-b border-slate-200">
      {items.map((i) => {
        const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} className={`whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium border-b-2 -mb-[10px] ${active ? "border-brand-600 text-brand-700" : "border-transparent text-slate-600 hover:text-slate-900"}`}>
            {i.label}
            {i.href === "/admin/solicitacoes" && pending > 0 && <span className="badge bg-red-500 text-white ml-1.5 px-1.5">{pending}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
