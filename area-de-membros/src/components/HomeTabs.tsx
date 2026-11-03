import Link from "next/link";
import { IconBook, IconLibrary, IconRoute } from "./Icons";

const tabs = [
  { href: "/inicio", label: "Cursos", icon: IconBook },
  { href: "/trilhas", label: "Trilhas", icon: IconRoute },
  { href: "/biblioteca", label: "Biblioteca", icon: IconLibrary },
];

export function HomeTabs({ active }: { active: string }) {
  return (
    <div className="no-scrollbar -mx-4 sm:mx-0 flex gap-3 overflow-x-auto px-4 sm:px-0">
      {tabs.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={`chip ${active === href ? "chip-active" : ""}`}>
          <Icon className="w-5 h-5" /> {label}
        </Link>
      ))}
    </div>
  );
}
