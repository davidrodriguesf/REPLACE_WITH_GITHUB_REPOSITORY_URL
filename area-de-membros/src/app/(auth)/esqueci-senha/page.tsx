import Link from "next/link";
import { ForgotForm } from "./Form";

export const metadata = { title: "Esqueci minha senha" };

export default function ForgotPage() {
  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-1">Criar ou redefinir senha</h1>
      <p className="text-sm text-muted mb-6">Enviaremos um link para o seu e-mail.</p>
      <ForgotForm />
      <p className="text-center text-sm mt-4">
        <Link href="/login" className="link">Voltar para o login</Link>
      </p>
    </>
  );
}
