import Link from "next/link";
import { AuthFrame } from "@/components/AuthFrame";
import { hasAnyAdmin, isDatabaseReady } from "@/lib/db/auth";
import { PrepareForm, SetupForm } from "./Form";

export const metadata = { title: "Primeiro acesso" };
export const dynamic = "force-dynamic";

export default async function PrimeiroAcesso() {
  const ready = await isDatabaseReady();
  const done = ready && (await hasAnyAdmin());
  return (
    <AuthFrame>
      <h1 className="text-3xl font-bold text-navy-950 mb-1">Primeiro acesso</h1>
      {!ready ? (
        <>
          <p className="text-slate-500 mb-2"><strong className="text-navy-950">Passo 1 de 2:</strong> preparar o banco de dados.</p>
          <p className="text-slate-500 mb-8">Cria as tabelas e as regras de acesso no Neon. É feito uma única vez.</p>
          <PrepareForm />
        </>
      ) : done ? (
        <>
          <p className="text-slate-500 mb-6">A plataforma já foi configurada.</p>
          <Link href="/login" className="btn btn-primary w-full">Ir para o login</Link>
        </>
      ) : (
        <>
          <p className="text-slate-500 mb-8"><strong className="text-navy-950">Passo 2 de 2:</strong> crie a conta de administrador(a) do RH. Esta tela só funciona uma vez.</p>
          <SetupForm />
        </>
      )}
    </AuthFrame>
  );
}
