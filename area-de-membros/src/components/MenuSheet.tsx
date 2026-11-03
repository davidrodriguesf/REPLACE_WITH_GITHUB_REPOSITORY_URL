"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/actions";
import { Avatar } from "./Avatar";
import { IconAward, IconBriefcase, IconChart, IconHelp, IconLibrary, IconLogout, IconShield, IconTarget, IconUser, IconUsers, IconX } from "./Icons";

type Props = { name: string | null; avatarUrl: string | null; jobRole: string | null; role: "employee" | "manager" | "admin"; supportUrl?: string };

/** Abre a gaveta do menu de qualquer lugar: window.dispatchEvent(new Event("open-menu")) */
export function openMenu() {
  window.dispatchEvent(new Event("open-menu"));
}

export function MenuTrigger({ className, children, label = "Abrir menu" }: { className?: string; children: React.ReactNode; label?: string }) {
  return (
    <button type="button" aria-label={label} className={className} onClick={openMenu}>
      {children}
    </button>
  );
}

export function MenuSheet({ name, avatarUrl, jobRole, role, supportUrl }: Props) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener("open-menu", on);
    return () => window.removeEventListener("open-menu", on);
  }, []);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  const item = "flex items-center gap-4 rounded-xl px-3 py-3.5 text-[17px] text-white/90 hover:bg-white/5";
  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-navy-950/40 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`} />
      <aside
        role="dialog"
        aria-label="Menu"
        className={`absolute bottom-0 inset-x-0 md:inset-x-auto md:right-4 md:top-4 md:bottom-auto md:w-96 max-h-[88dvh] overflow-auto rounded-t-3xl md:rounded-3xl bg-[#1a1d22] text-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full md:-translate-y-[120%]"
        }`}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20 md:hidden" />
        <button onClick={() => setOpen(false)} aria-label="Fechar" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20 cursor-pointer">
          <IconX />
        </button>
        <div className="flex items-center gap-4 pb-4 pr-12">
          <div className="relative">
            <Avatar name={name} url={avatarUrl} size={60} square />
            <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 ring-4 ring-[#1a1d22]" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold truncate">{name ?? "Colaborador"}</p>
            <p className="text-white/60">{jobRole ?? "Ativo"}</p>
          </div>
        </div>
        <nav className="space-y-0.5">
          <Link href="/perfil" className={item}><IconUser className="w-6 h-6" />Ver perfil</Link>
          <Link href="/desenvolvimento" className={item}><IconTarget className="w-6 h-6" />Meu desenvolvimento</Link>
          <Link href="/desenvolvimento/certificados" className={item}><IconAward className="w-6 h-6" />Certificados</Link>
          <Link href="/comunidade" className={item}><IconUsers className="w-6 h-6" />Comunidade</Link>
          <Link href="/biblioteca" className={item}><IconLibrary className="w-6 h-6" />Biblioteca</Link>
          {role !== "employee" && <Link href="/equipe" className={item}><IconBriefcase className="w-6 h-6" />Minha equipe</Link>}
          {role === "admin" && <Link href="/admin" className={item}><IconShield className="w-6 h-6" />Painel administrativo</Link>}
          {role === "admin" && <Link href="/admin/relatorios" className={item}><IconChart className="w-6 h-6" />Relatórios</Link>}
        </nav>
        <div className="my-3 border-t border-white/10" />
        {supportUrl && (
          <a href={supportUrl} target="_blank" rel="noopener noreferrer" className={item}><IconHelp className="w-6 h-6" />Suporte</a>
        )}
        <form action={logout}>
          <button className={`${item} w-full text-red-400 cursor-pointer`}><IconLogout className="w-6 h-6" />Sair</button>
        </form>
      </aside>
    </div>
  );
}
