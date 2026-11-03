import { initials } from "@/lib/utils";

export function Avatar({ name, url, size = 40, square = false, dark = false }: { name: string | null | undefined; url?: string | null; size?: number; square?: boolean; dark?: boolean }) {
  const radius = square ? "rounded-2xl" : "rounded-full";
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name ?? ""} width={size} height={size} className={`${radius} object-cover shrink-0`} style={{ width: size, height: size }} />;
  }
  return (
    <span
      className={`${radius} ${dark || square ? "bg-navy-700 text-white" : "bg-navy-100 text-navy-800"} font-bold grid place-items-center shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}
