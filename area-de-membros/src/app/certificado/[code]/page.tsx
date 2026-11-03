import { createClient } from "@/lib/supabase/server";
import { CertificateArt } from "@/components/Certificate";
import { SITE_NAME, formatDate } from "@/lib/utils";

export const metadata = { title: "Verificar certificado" };

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("verify_certificate", { cert_code: decodeURIComponent(code) });
  const c = ((data ?? []) as { full_name: string; course_title: string; hours: number | null; issued_at: string; code: string }[])[0];
  return (
    <main className="min-h-dvh bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-[1000px] space-y-6">
        {c ? (
          <>
            <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-800">
              <p className="text-lg font-bold">✓ Certificado válido</p>
              <p>Emitido por {SITE_NAME} para <strong>{c.full_name}</strong> em {formatDate(c.issued_at)}.</p>
            </div>
            <CertificateArt name={c.full_name} course={c.course_title} hours={c.hours} issuedAt={c.issued_at} code={c.code} />
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
