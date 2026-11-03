import { LoginForm } from "./LoginForm";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <h1 className="text-xl font-bold mb-1">Entrar na área de membros</h1>
      <p className="text-sm text-muted mb-6">Use o e-mail da sua compra.</p>
      <LoginForm next={sp.next} linkError={sp.erro === "link"} />
    </>
  );
}
