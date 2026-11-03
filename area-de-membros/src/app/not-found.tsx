import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh grid place-items-center p-6 text-center">
      <div>
        <p className="text-6xl font-bold text-brand-600">404</p>
        <p className="mt-2 text-muted">Página não encontrada.</p>
        <Link href="/dashboard" className="btn btn-primary mt-6">Voltar ao início</Link>
      </div>
    </main>
  );
}
