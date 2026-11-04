import Link from "next/link";
import { IconChevronDown } from "./Icons";

/** Página com cara de "gaveta" (bottom sheet) no celular e cartão central no computador. */
export function Sheet({ backHref, children, footer }: { backHref: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="-mx-4 sm:mx-0 -mt-6 sm:mt-0 min-h-[calc(100dvh-72px)] bg-navy-50 sm:bg-transparent pt-4 sm:pt-0">
      <div className="relative mx-auto max-w-3xl rounded-t-[28px] sm:rounded-3xl bg-white sm:border sm:border-slate-200 sm:shadow-xl sm:shadow-navy-950/5 pb-32 sm:pb-6">
        <div className="sticky top-[72px] z-10 flex justify-center rounded-t-[28px] bg-white pt-3 pb-2 sm:static">
          <span className="h-1.5 w-12 rounded-full bg-slate-300" />
          <Link href={backHref} aria-label="Fechar" className="absolute right-3 top-2 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-navy-900 hover:bg-slate-200">
            <IconChevronDown className="w-6 h-6" />
          </Link>
        </div>
        <div className="px-5 sm:px-8 pt-2">{children}</div>
        {footer && (
          <div className="fixed sm:sticky bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white px-5 sm:px-8 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:rounded-b-3xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
