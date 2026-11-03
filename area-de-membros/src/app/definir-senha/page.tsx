import { requireUser } from "@/lib/auth";
import { PosterWall } from "@/components/PosterWall";
import { SITE_NAME } from "@/lib/utils";
import { SetPasswordForm } from "./Form";

export const metadata = { title: "Definir senha" };

export default async function SetPasswordPage() {
  const { profile } = await requireUser();
  return (
    <main className="relative min-h-dvh flex flex-col">
      <PosterWall />
      <header className="relative gutter h-20 flex items-center">
        <span className="font-black text-2xl sm:text-3xl uppercase tracking-tight text-brand-600">{SITE_NAME}</span>
      </header>
      <div className="relative flex-1 grid place-items-center px-4 pb-16">
        <div className="w-full max-w-md rounded-lg bg-black/75 backdrop-blur-sm p-8 sm:p-12 shadow-2xl">
          <h1 className="text-3xl font-bold text-white mb-1">Crie sua senha</h1>
          <p className="text-sm text-muted mb-6">{profile.email}</p>
          <SetPasswordForm name={profile.full_name ?? ""} />
        </div>
      </div>
    </main>
  );
}
