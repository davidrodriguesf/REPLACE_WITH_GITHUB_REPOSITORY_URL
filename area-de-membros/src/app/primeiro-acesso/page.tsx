import Link from "next/link";
import { AuthFrame } from "@/components/AuthFrame";
import { hasAnyAdmin } from "@/lib/db/auth";
import { SetupForm } from "./Form";

export const metadata = { title: "Primeiro acesso" };
export const dynamic = "force-dynamic";

export default async function PrimeiroAcesso() {
  const done = await hasAnyAdmin();
  return (
    <AuthFrame>
      <h1 className="text-3xl font-bold text-navy-950 mb-1">Primeiro acesso</h1>
      {done ? (
        <>
          <p className="text-slate-500 mb-6">A plataforma já foi configurada.</p>
          <Link href="/login" className="btn btn-primary w-full">Ir para o login</Link>
        </>
      ) : (
        <>
          <p className="text-slate-500 mb-8">Crie a conta de administrador(a) do RH. Esta tela só funciona uma vez.</p>
          <SetupForm />
        </>
      )}
    </AuthFrame>
  );
}
