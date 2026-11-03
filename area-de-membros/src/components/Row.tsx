"use client";

import { useRef } from "react";

/** Fileira com rolagem horizontal e setas (estilo streaming). */
export function Row({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  return (
    <section className="group/row relative">
      <div className="flex items-end justify-between gap-4 mb-2">
        <div>
          <h2 className="h-row">{title}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="relative bleed">
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => scroll(-1)}
          className="hidden md:grid absolute left-0 inset-y-0 z-20 w-8 lg:w-12 place-items-center bg-gradient-to-r from-ink to-transparent text-white text-3xl opacity-0 group-hover/row:opacity-100 transition cursor-pointer"
        >
          ‹
        </button>
        <div ref={ref} className="no-scrollbar gutter scroll-px-4 sm:scroll-px-8 lg:scroll-px-12 flex gap-2 sm:gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory py-4 -my-2 after:content-[''] after:shrink-0 after:w-px">
          {children}
        </div>
        <button
          type="button"
          aria-label="Avançar"
          onClick={() => scroll(1)}
          className="hidden md:grid absolute right-0 inset-y-0 z-20 w-8 lg:w-12 place-items-center bg-gradient-to-l from-ink to-transparent text-white text-3xl opacity-0 group-hover/row:opacity-100 transition cursor-pointer"
        >
          ›
        </button>
      </div>
    </section>
  );
}

