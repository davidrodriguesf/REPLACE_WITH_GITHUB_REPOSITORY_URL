import { requireUser } from "@/lib/auth";
import { SITE_NAME } from "@/lib/utils";
import { SetPasswordForm } from "./Form";

export const metadata = { title: "Definir senha" };

export default async function SetPasswordPage() {
  const { profile } = await requireUser();
  return (
    <main className="min-h-dvh grid place-items-center px-4 py-10 bg-gradient-to-br from-brand-700 via-brand-600 to-fuchsia-600">
      <div className="w-full max-w-md">
        <p className="text-center text-white text-2xl font-bold mb-6">{SITE_NAME}</p>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold mb-1">Crie sua senha</h1>
          <p className="text-sm text-muted mb-6">{profile.email}</p>
          <SetPasswordForm name={profile.full_name ?? ""} />
        </div>
      </div>
    </main>
  );
}
