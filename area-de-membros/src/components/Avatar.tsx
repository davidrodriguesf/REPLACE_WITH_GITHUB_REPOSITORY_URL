import { initials } from "@/lib/utils";

const COLORS = ["#e11d2e", "#2563eb", "#059669", "#d97706", "#7c3aed", "#db2777", "#0891b2"];

function colorFor(name: string | null | undefined) {
  const s = name ?? "?";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length]!;
}

export function Avatar({ name, url, size = 40, square = false }: { name: string | null | undefined; url?: string | null; size?: number; square?: boolean }) {
  const radius = square ? "rounded-md" : "rounded-full";
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name ?? ""} width={size} height={size} className={`${radius} object-cover shrink-0`} style={{ width: size, height: size }} />;
  }
  return (
    <span
      className={`${radius} text-white font-bold grid place-items-center shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.38, background: colorFor(name) }}
    >
      {initials(name)}
    </span>
  );
}
