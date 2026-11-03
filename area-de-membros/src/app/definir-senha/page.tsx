import { requireUser } from "@/lib/auth";
import { AuthFrame } from "@/components/AuthFrame";
import { SetPasswordForm } from "./Form";

export const metadata = { title: "Definir senha" };

export default async function SetPasswordPage() {
  const { profile } = await requireUser();
  return (
    <AuthFrame>
      <h1 className="text-3xl font-bold text-navy-950 mb-1">Crie sua senha</h1>
      <p className="text-slate-500 mb-8">{profile.email}</p>
      <SetPasswordForm name={profile.full_name ?? ""} />
    </AuthFrame>
  );
}
