import { LoginForm } from "./LoginForm";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-1">Entrar</h1>
      <p className="text-sm text-muted mb-8">Use o e-mail da sua compra para acessar seus cursos, a comunidade e os eventos.</p>
      <LoginForm next={sp.next} linkError={sp.erro === "link"} />
    </>
  );
}
