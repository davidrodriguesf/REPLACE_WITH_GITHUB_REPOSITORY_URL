import { PosterWall } from "@/components/PosterWall";
import { SITE_NAME } from "@/lib/utils";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-dvh flex flex-col">
      <PosterWall />
      <header className="relative gutter h-20 flex items-center">
        <span className="font-black text-2xl sm:text-3xl uppercase tracking-tight text-brand-600">{SITE_NAME}</span>
      </header>
      <div className="relative flex-1 grid place-items-center px-4 pb-16">
        <div className="w-full max-w-md rounded-lg bg-black/75 backdrop-blur-sm p-8 sm:p-12 shadow-2xl">{children}</div>
      </div>
    </main>
  );
}
