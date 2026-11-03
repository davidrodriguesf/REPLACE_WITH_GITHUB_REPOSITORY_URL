import { requireUser } from "@/lib/auth";
import { PasswordForm, ProfileForm } from "./Forms";

export const metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const { profile } = await requireUser();
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="h-page">Meu perfil</h1>
      <ProfileForm profile={profile} />
      <PasswordForm />
    </div>
  );
}
