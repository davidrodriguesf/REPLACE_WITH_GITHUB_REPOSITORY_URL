import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { IconChevronLeft } from "@/components/Icons";
import { PasswordForm, ProfileForm } from "../Forms";

export const metadata = { title: "Editar perfil" };

export default async function EditarPerfil() {
  const { profile } = await requireUser();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/perfil" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-navy-900"><IconChevronLeft className="w-4 h-4" />Perfil</Link>
      <h1 className="h-page">Editar perfil</h1>
      <ProfileForm profile={profile} />
      <PasswordForm />
    </div>
  );
}
