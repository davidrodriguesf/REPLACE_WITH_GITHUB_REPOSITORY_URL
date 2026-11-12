import { LoginForm } from "./LoginForm";
import { pestxEnabled } from "@/lib/pestx";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-bold text-navy-950 mb-1">Entrar</h1>
      <p className="text-slate-500 mb-8">{pestxEnabled() ? "Use o mesmo e-mail e senha do PestX." : "Use seu e-mail corporativo."}</p>
      <LoginForm pestx={pestxEnabled()} next={sp.next} linkError={sp.erro === "link"} inactive={sp.erro === "inativo"} />
    </>
  );
}
