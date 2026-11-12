"use client";

import { useActionState, useState } from "react";
import { saveCompany } from "./actions";
import { FileField } from "@/components/FileField";
import { FormMessage, SubmitButton } from "@/components/ui";

type Vals = { custom_name: string; cnpj: string; billing_email: string; brand_color: string; logo_url: string | null;
  signer_name: string; signer_title: string; signature_url: string | null };
type Pestx = { name?: string | null; cnpj?: string | null; email?: string | null; logo_url?: string | null; signer_name?: string | null; signature_url?: string | null };

export function CompanyForm({ v, pestx }: { v: Vals; pestx: Pestx }) {
  const [state, action] = useActionState(saveCompany, undefined);
  const [color, setColor] = useState(v.brand_color || "#6d28d9");
  const fromPestx = (x?: string | null) => (x ? `Do PestX: ${x}` : undefined);
  return (
    <form action={action} className="card space-y-6 p-5">
      <fieldset className="space-y-3">
        <legend className="h-section mb-2">Empresa</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Nome no certificado</label>
            <input className="input" name="custom_name" defaultValue={v.custom_name} placeholder={pestx.name ?? "Nome da empresa"} />
            <p className="mt-1 text-xs text-slate-500">Vazio = usa o nome do PestX{pestx.name ? ` (${pestx.name})` : ""}.</p>
          </div>
          <div>
            <label className="label">CNPJ</label>
            <input className="input" name="cnpj" defaultValue={v.cnpj} placeholder={pestx.cnpj ?? "00.000.000/0000-00"} />
            <p className="mt-1 text-xs text-slate-500">Usado no certificado e nas compras do marketplace.</p>
          </div>
          <div>
            <label className="label">E-mail para cobranças</label>
            <input className="input" name="billing_email" type="email" defaultValue={v.billing_email} placeholder={pestx.email ?? "financeiro@empresa.com.br"} />
          </div>
          <div>
            <label className="label">Cor do certificado</label>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 w-14 cursor-pointer rounded-lg border border-slate-200" aria-label="Cor" />
              <input className="input" name="brand_color" value={color} onChange={(e) => setColor(e.target.value)} pattern="#[0-9a-fA-F]{6}" />
            </div>
          </div>
        </div>
        <FileField name="logo" label="Logo da empresa" current={v.logo_url} aspect="aspect-[3/1]" hint={v.logo_url ? undefined : pestx.logo_url ? "Sem envio, usamos o logo cadastrado no PestX." : "PNG com fundo transparente fica melhor."} />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="h-section mb-2">Quem assina o certificado</legend>
        <p className="text-sm text-slate-500">O certificado é assinado pelo <strong>responsável legal da empresa</strong> (o mesmo do PestX), não pelo RH.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Nome do responsável legal</label>
            <input className="input" name="signer_name" defaultValue={v.signer_name} placeholder={pestx.signer_name ?? "Nome completo"} />
            {pestx.signer_name && !v.signer_name && <p className="mt-1 text-xs text-slate-500">{fromPestx(pestx.signer_name)}</p>}
          </div>
          <div>
            <label className="label">Cargo</label>
            <input className="input" name="signer_title" defaultValue={v.signer_title} placeholder="Ex.: Sócio-diretor" />
          </div>
        </div>
        <FileField name="signature" label="Assinatura (imagem)" current={v.signature_url} aspect="aspect-[3/1]"
          hint={`Assine numa folha branca, fotografe e envie (PNG com fundo transparente fica melhor).${!v.signature_url && pestx.signature_url ? " Sem envio, usamos a assinatura do PestX." : ""}`} />
      </fieldset>
      <FormMessage state={state} />
      <SubmitButton>Salvar</SubmitButton>
    </form>
  );
}
