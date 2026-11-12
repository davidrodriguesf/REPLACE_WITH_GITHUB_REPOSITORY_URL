import { SITE_NAME, formatDate, initials, siteUrl } from "@/lib/utils";
import type { Branding } from "@/lib/company";

/** Certificado com a marca da empresa: nome, logo, cor e assinatura do responsável legal. */
export function CertificateArt({ name, course, hours, issuedAt, code, company }: {
  name: string; course: string; hours: number | null; issuedAt: string; code: string; company: Branding | null;
}) {
  const color = company?.color || "#6d28d9";
  const companyName = company?.name || SITE_NAME;
  return (
    <div className="certificate relative mx-auto aspect-[1.414/1] w-full max-w-[1000px] overflow-hidden rounded-xl bg-[#fbfaf7] text-navy-950 shadow-2xl shadow-navy-950/10 print:rounded-none print:shadow-none" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact", containerType: "inline-size" }}>
      <div className="absolute inset-0 m-[2.2%] rounded-lg border-[3px]" style={{ borderColor: color }} />
      <div className="absolute inset-0 m-[3.4%] rounded border" style={{ borderColor: color }} />
      <div className="absolute left-0 top-0 h-full w-[13%]" style={{ background: `linear-gradient(to bottom, ${color}, ${color}cc)` }} />
      <div className="absolute left-[13%] top-0 h-full w-[0.6%]" style={{ background: color }} />
      <div className="relative flex h-full flex-col justify-between py-[6%] pl-[20%] pr-[8%]">
        <div className="flex items-center gap-[2%]">
          {company?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logo_url} alt="" className="h-[clamp(28px,6cqw,64px)] max-w-[40%] object-contain" />
          ) : (
            <span className="grid aspect-square h-[clamp(28px,5cqw,52px)] place-items-center rounded-xl font-extrabold text-white text-[clamp(10px,1.8cqw,18px)]" style={{ background: color }}>
              {initials(companyName)}
            </span>
          )}
          <div className="min-w-0">
            <p className="font-bold tracking-wide text-[clamp(10px,1.7cqw,18px)] leading-tight">{companyName}</p>
            <p className="text-slate-500 text-[clamp(7px,1.05cqw,12px)]">{SITE_NAME}</p>
          </div>
        </div>
        <div>
          <p className="font-bold uppercase tracking-[0.35em] text-[clamp(8px,1.3cqw,14px)]" style={{ color }}>Certificado de conclusão</p>
          <p className="mt-[2%] text-slate-500 text-[clamp(9px,1.4cqw,15px)]">Certificamos que</p>
          <p className="mt-[1%] font-serif text-[clamp(22px,4.6cqw,48px)] leading-tight">{name}</p>
          <p className="mt-[2%] max-w-[90%] text-slate-600 text-[clamp(9px,1.5cqw,16px)] leading-relaxed">
            concluiu com êxito o curso <strong className="text-navy-950">{course}</strong>
            {hours ? <>, com carga horária de <strong className="text-navy-950">{String(hours).replace(".", ",")} horas</strong></> : null}, em {formatDate(issuedAt, { day: "2-digit", month: "long", year: "numeric" })}.
          </p>
        </div>
        <div className="flex items-end justify-between gap-6">
          <div className="min-w-[38%]">
            {company?.signature_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.signature_url} alt="Assinatura" className="mb-[-2%] h-[clamp(24px,5.5cqw,60px)] max-w-full object-contain object-left" />
            ) : (
              <div className="h-[clamp(24px,5.5cqw,60px)]" />
            )}
            <div className="border-t pt-1.5" style={{ borderColor: color }}>
              <p className="font-semibold text-[clamp(8px,1.3cqw,14px)]">{company?.signer_name || "Responsável legal"}</p>
              <p className="text-slate-500 text-[clamp(7px,1.1cqw,12px)]">{company?.signer_title || "Responsável legal"} · {companyName}</p>
            </div>
          </div>
          <div className="text-right text-slate-500 text-[clamp(7px,1cqw,11px)]">
            <p>Código de verificação</p>
            <p className="font-mono font-bold text-navy-950 text-[clamp(8px,1.3cqw,14px)]">{code}</p>
            <p>{siteUrl(`/certificado/${code}`).replace(/^https?:\/\//, "")}</p>
            {company?.cnpj && <p>CNPJ {company.cnpj}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
