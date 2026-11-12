import { requireAdmin } from "@/lib/auth";
import { getCompanyRow, toBranding } from "@/lib/company";
import { CertificateArt } from "@/components/Certificate";
import { CompanyForm } from "./CompanyForm";

export default async function EmpresaAdmin() {
  const { profile } = await requireAdmin();
  const row = await getCompanyRow(profile.company_id);
  if (!row) return <p className="text-slate-500">Sua conta não está ligada a uma empresa. Entre com o login do PestX.</p>;
  const b = toBranding(row);
  const p = row.pestx || {};
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="min-w-0">
        <h1 className="h-row mb-1">Empresa e certificado</h1>
        <p className="mb-4 text-slate-500">Nome, logo e cor que aparecem no app e no certificado. Os dados vêm do PestX; aqui você só ajusta o que quiser.</p>
        <CompanyForm
          pestx={p}
          v={{
            custom_name: row.custom_name ?? "", cnpj: row.cnpj ?? "", billing_email: row.billing_email ?? "", brand_color: row.brand_color ?? "",
            logo_url: row.logo_url, signer_name: row.signer_name ?? "", signer_title: row.signer_title ?? "", signature_url: row.signature_url,
          }}
        />
      </section>
      <section className="min-w-0">
        <h2 className="h-section mb-3">Como fica o certificado</h2>
        <CertificateArt name="Nome do Colaborador" course="Curso de exemplo" hours={4} issuedAt={new Date().toISOString()} code="ABCD-1234-EFGH" company={b} />
      </section>
    </div>
  );
}
