"use client";

import { useEffect, useState } from "react";

/** Cabeçalho transparente sobre o banner que fica sólido ao rolar a página. */
export function HeaderBar({ children }: { children: React.ReactNode }) {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header
      className={`fixed top-0 inset-x-0 z-30 transition-colors duration-300 ${
        solid ? "bg-ink/95 backdrop-blur shadow-lg shadow-black/40" : "bg-gradient-to-b from-black/80 via-black/40 to-transparent"
      }`}
    >
      {children}
    </header>
  );
}
