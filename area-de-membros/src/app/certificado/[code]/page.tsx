import { createClient } from "@/lib/db/server";
import { CertificateArt } from "@/components/Certificate";
import { formatDate } from "@/lib/utils";
import { getBranding } from "@/lib/company";

export const metadata = { title: "Verificar certificado" };

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("verify_certificate", { cert_code: decodeURIComponent(code) });
  const c = ((data ?? []) as { full_name: string; course_title: string; hours: number | null; issued_at: string; code: string; company_name: string | null; company_id: string | null }[])[0];
  const company = c ? await getBranding(c.company_id) : null;
  return (
    <main className="min-h-dvh bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-[1000px] space-y-6">
        {c ? (
          <>
            <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-800">
              <p className="text-lg font-bold">✓ Certificado válido</p>
              <p>Emitido por <strong>{c.company_name ?? "Academia PestX"}</strong> (Academia PestX) para <strong>{c.full_name}</strong> em {formatDate(c.issued_at)}.</p>
            </div>
            <CertificateArt name={c.full_name} course={c.course_title} hours={c.hours} issuedAt={c.issued_at} code={c.code} company={company} />
          </>
        ) : (
          <div className="rounded-2xl bg-red-50 p-6 text-red-700">
            <p className="text-lg font-bold">Certificado não encontrado</p>
            <p>Confira se o código foi digitado corretamente.</p>
          </div>
        )}
      </div>
    </main>
  );
}
