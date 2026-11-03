/** Fundo decorativo: mosaico de "pôsteres" inclinado e escurecido, só com CSS. */
const tiles = [
  "from-brand-600 to-amber-200", "from-sky-700 to-indigo-900", "from-emerald-600 to-teal-900", "from-fuchsia-700 to-rose-900",
  "from-orange-600 to-red-900", "from-violet-700 to-slate-100", "from-cyan-600 to-blue-900", "from-rose-600 to-brand-100",
  "from-amber-500 to-orange-900", "from-indigo-600 to-violet-900", "from-teal-500 to-emerald-900", "from-red-600 to-ink",
];

export function PosterWall() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div className="absolute -inset-[20%] grid grid-cols-5 sm:grid-cols-9 lg:grid-cols-12 gap-2 sm:gap-3 rotate-[-12deg] opacity-90">
        {Array.from({ length: 132 }, (_, i) => (
          <div key={i} className={`aspect-[2/3] rounded-md bg-gradient-to-br ${tiles[(i * 7) % tiles.length]}`} />
        ))}
      </div>
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80" />
    </div>
  );
}
