import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { CertificateArt } from "@/components/Certificate";
import { siteUrl } from "@/lib/utils";
import { getBranding } from "@/lib/company";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Certificado" };

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireUser();
  const { data } = await supabase.from("certificates").select("*, courses(title), profiles(full_name)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const c = data as unknown as { company_id: string | null; code: string; hours: number | null; issued_at: string; courses: { title: string } | null; profiles: { full_name: string | null } | null };
  const company = await getBranding(c.company_id || profile.company_id);
  return (
    <main className="min-h-dvh bg-slate-100 px-4 py-8 print:bg-white print:p-0">
      <style>{`@page { size: A4 landscape; margin: 0 } @media print { .certificate { width: 297mm !important; max-width: none !important; } }`}</style>
      <div className="mx-auto mb-6 flex max-w-[1000px] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/desenvolvimento/certificados" className="btn btn-light">‹ Voltar</Link>
        <div className="flex gap-2">
          <Link href={`/certificado/${c.code}`} className="btn btn-light">Página de verificação</Link>
          <PrintButton />
        </div>
      </div>
      <CertificateArt name={c.profiles?.full_name ?? ""} course={c.courses?.title ?? ""} hours={c.hours} issuedAt={c.issued_at} code={c.code} company={company} />
      <p className="mx-auto mt-6 max-w-[1000px] text-center text-sm text-slate-500 print:hidden">
        Qualquer pessoa pode confirmar este certificado em {siteUrl(`/certificado/${c.code}`)}
      </p>
    </main>
  );
}
