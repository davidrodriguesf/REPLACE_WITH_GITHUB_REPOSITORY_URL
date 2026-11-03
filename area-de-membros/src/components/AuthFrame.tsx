import { AppLogo } from "./AppShell";
import { COMPANY_NAME, SITE_NAME } from "@/lib/utils";

/** Moldura das telas de login/senha. */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-[1.1fr_1fr]">
      <section className="relative overflow-hidden bg-navy-900 px-6 pb-16 pt-[calc(2rem+env(safe-area-inset-top))] text-white lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div aria-hidden className="absolute -right-24 -top-24 h-80 w-80 rounded-full border-[40px] border-white/5" />
        <div aria-hidden className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full border-[50px] border-gold-500/10" />
        <div className="relative flex items-center gap-3">
          <AppLogo size={48} />
          <span className="text-2xl font-bold">{SITE_NAME}</span>
        </div>
        <div className="relative mt-10 lg:mt-0 max-w-md">
          <h2 className="text-3xl lg:text-5xl font-bold leading-tight">Aprender, evoluir e crescer junto com a {COMPANY_NAME}.</h2>
          <p className="mt-4 hidden lg:block text-lg text-white/60">Trilhas da sua função, cursos, avaliações, certificados e a comunidade da empresa em um só lugar.</p>
        </div>
        <p className="relative hidden lg:block text-sm text-white/40">Acesso exclusivo para colaboradores.</p>
      </section>
      <section className="relative -mt-8 rounded-t-[28px] bg-white px-6 pt-10 pb-12 lg:mt-0 lg:rounded-none lg:grid lg:place-items-center">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
