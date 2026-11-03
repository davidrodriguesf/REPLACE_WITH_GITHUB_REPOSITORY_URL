import { AppLogo } from "./AppShell";
import { COMPANY_NAME, SITE_NAME, formatDate, siteUrl } from "@/lib/utils";

export function CertificateArt({ name, course, hours, issuedAt, code }: { name: string; course: string; hours: number | null; issuedAt: string; code: string }) {
  const signer = process.env.NEXT_PUBLIC_CERT_SIGNER || "Responsável pelo RH";
  const signerTitle = process.env.NEXT_PUBLIC_CERT_SIGNER_TITLE || COMPANY_NAME;
  return (
    <div className="certificate relative mx-auto aspect-[1.414/1] w-full max-w-[1000px] overflow-hidden rounded-xl bg-[#fbfaf7] text-navy-950 shadow-2xl shadow-navy-950/10 print:rounded-none print:shadow-none">
      <div className="absolute inset-0 m-[2.2%] rounded-lg border-[3px] border-navy-900" />
      <div className="absolute inset-0 m-[3.4%] rounded border border-gold-500" />
      <div className="absolute left-0 top-0 h-full w-[13%] bg-gradient-to-b from-navy-950 to-navy-700" />
      <div className="absolute left-[13%] top-0 h-full w-[0.6%] bg-gold-500" />
      <div className="relative flex h-full flex-col justify-between py-[6%] pl-[20%] pr-[8%]">
        <div className="flex items-center gap-3">
          <AppLogo size={44} />
          <p className="font-bold tracking-wide text-[clamp(10px,1.6vw,16px)]">{SITE_NAME}</p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-[0.35em] text-gold-600 text-[clamp(8px,1.3vw,14px)]">Certificado de conclusão</p>
          <p className="mt-[2%] text-slate-500 text-[clamp(9px,1.4vw,15px)]">Certificamos que</p>
          <p className="mt-[1%] font-serif text-[clamp(22px,4.6vw,48px)] leading-tight">{name}</p>
          <p className="mt-[2%] max-w-[90%] text-slate-600 text-[clamp(9px,1.5vw,16px)] leading-relaxed">
            concluiu com êxito o curso <strong className="text-navy-950">{course}</strong>
            {hours ? <>, com carga horária de <strong className="text-navy-950">{String(hours).replace(".", ",")} horas</strong></> : null}, em {formatDate(issuedAt, { day: "2-digit", month: "long", year: "numeric" })}.
          </p>
        </div>
        <div className="flex items-end justify-between gap-6">
          <div className="min-w-[35%]">
            <div className="border-t border-navy-900 pt-1.5">
              <p className="font-semibold text-[clamp(8px,1.3vw,14px)]">{signer}</p>
              <p className="text-slate-500 text-[clamp(7px,1.1vw,12px)]">{signerTitle}</p>
            </div>
          </div>
          <div className="text-right text-slate-500 text-[clamp(7px,1vw,11px)]">
            <p>Código de verificação</p>
            <p className="font-mono font-bold text-navy-950 text-[clamp(8px,1.3vw,14px)]">{code}</p>
            <p>{siteUrl(`/certificado/${code}`).replace(/^https?:\/\//, "")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
