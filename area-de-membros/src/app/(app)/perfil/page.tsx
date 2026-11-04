import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { IconChevronLeft, IconEdit } from "@/components/Icons";
import { formatDate, initials } from "@/lib/utils";

export const metadata = { title: "Perfil" };

export default async function Perfil({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba = "pessoal" } = await searchParams;
  const { supabase, profile } = await requireUser();
  const [{ data: jr }, { data: mgr }] = await Promise.all([
    profile.job_role_id ? supabase.from("job_roles").select("name").eq("id", profile.job_role_id).maybeSingle() : Promise.resolve({ data: null }),
    profile.manager_id ? supabase.from("member_profiles").select("full_name").eq("id", profile.manager_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const jobRole = (jr?.name as string | undefined) ?? null;
  const roleLabel = { employee: "Colaborador(a)", manager: "Gestor(a)", admin: "Administrador(a)" }[profile.role];

  const rows: [string, string | null][] =
    aba === "empresa"
      ? [["Função", jobRole], ["Departamento", profile.department], ["Gestor(a)", (mgr?.full_name as string | undefined) ?? null], ["Data de admissão", profile.hired_at ? formatDate(profile.hired_at) : null], ["Perfil de acesso", roleLabel]]
      : [["Nome completo", profile.full_name], ["E-mail", profile.email], ["Telefone", profile.phone], ["Sobre", profile.bio], ["Estado", profile.state], ["Cidade", profile.city]];

  return (
    <div className="-mx-4 sm:mx-auto -mt-6 sm:mt-0 max-w-3xl min-h-[calc(100dvh-72px)] bg-white text-navy-950 sm:rounded-3xl sm:border sm:border-slate-200 sm:overflow-hidden">
      <div className="relative bg-gradient-to-br from-brand-600 to-brand-800 px-4 pb-10 pt-4 text-white">
        <Link href="/inicio" aria-label="Voltar" className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/15"><IconChevronLeft /></Link>
        <div className="grid place-items-center py-8">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-40 w-40 rounded-full object-cover" />
          ) : (
            <span className="text-8xl font-bold tracking-tight text-white/85">{initials(profile.full_name)}</span>
          )}
        </div>
      </div>
      <div className="space-y-6 px-5 pb-28 pt-6">
        <div>
          <h1 className="text-3xl font-bold">{profile.full_name}</h1>
          <p className="mt-1 text-lg text-slate-500">{jobRole ?? roleLabel}</p>
          <p className="mt-3 flex items-center gap-2 text-lg"><span className="h-3 w-3 rounded-full bg-emerald-400" />Ativo</p>
        </div>
        <div className="flex rounded-xl border border-slate-200 p-1">
          <Link href="/perfil" className={`flex-1 rounded-xl px-3 py-3 text-center font-semibold ${aba !== "empresa" ? "bg-brand-600 text-white" : "text-slate-500"}`}>Informações Pessoais</Link>
          <Link href="/perfil?aba=empresa" className={`flex-1 rounded-xl px-3 py-3 text-center font-semibold ${aba === "empresa" ? "bg-brand-600 text-white" : "text-slate-500"}`}>Informações da Empresa</Link>
        </div>
        <dl className="space-y-5">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-slate-500">{k}</dt>
              <dd className="mt-0.5 text-lg break-words">{v || "-"}</dd>
            </div>
          ))}
        </dl>
      </div>
      <Link href="/perfil/editar" aria-label="Editar perfil" className="fixed bottom-8 right-5 md:bottom-10 md:right-10 z-30 grid h-16 w-16 place-items-center rounded-full bg-brand-600 text-white shadow-xl shadow-brand-600/30 hover:bg-brand-700">
        <IconEdit className="w-7 h-7" />
      </Link>
    </div>
  );
}
