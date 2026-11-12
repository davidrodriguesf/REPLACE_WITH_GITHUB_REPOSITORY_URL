"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const base = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/colaboradores", label: "Colaboradores" },
  { href: "/admin/funcoes", label: "Funções" },
  { href: "/admin/trilhas", label: "Trilhas" },
  { href: "/admin/cursos", label: "Cursos e provas" },
  { href: "/admin/catalogo", label: "Categorias e mentores" },
  { href: "/admin/biblioteca", label: "Biblioteca" },
  { href: "/admin/eventos", label: "Eventos" },
  { href: "/admin/comunidade", label: "Comunidade" },
  { href: "/admin/relatorios", label: "Relatórios" },
  { href: "/admin/loja", label: "Marketplace" },
  { href: "/admin/empresa", label: "Empresa e certificado" },
];

export function AdminNav({ superAdmin = false }: { superAdmin?: boolean }) {
  const path = usePathname();
  const items = superAdmin ? [...base, { href: "/admin/marketplace", label: "Super admin PestX" }] : base;
  return (
    <nav className="no-scrollbar -mx-4 sm:mx-0 mb-8 flex gap-2 overflow-x-auto px-4 sm:px-0">
      {items.map((i) => {
        const active = i.href === "/admin" ? path === "/admin" : path === i.href || path.startsWith(i.href + "/");
        return (
          <Link key={i.href} href={i.href} className={`chip !px-4 !py-2 !text-sm ${active ? "chip-active" : ""}`}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
