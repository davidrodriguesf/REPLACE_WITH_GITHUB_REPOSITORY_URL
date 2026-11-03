import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { revokeEnrollment, setRole } from "../../actions";
import { Avatar } from "@/components/Avatar";
import { ConfirmButton } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { GrantForm } from "../GrantForm";

export default async function AdminStudent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireAdmin();
  const { data: p } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  if (!p) notFound();
  const [{ data: enrollments }, { data: courses }, { count: posts }] = await Promise.all([
    supabase.from("enrollments").select("id, course_id, source, order_id, created_at, courses(title)").eq("user_id", id).order("created_at"),
    supabase.from("courses").select("id, title, access_type").order("position"),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("author_id", id),
  ]);
  const enrolled = new Set((enrollments ?? []).map((e) => e.course_id as string));
  const available = (courses ?? []).filter((c) => !enrolled.has(c.id)) as { id: string; title: string; access_type: "paid" | "free" }[];

  return (
    <div className="space-y-6">
      <Link href="/admin/alunos" className="link text-sm">← Alunos</Link>
      <div className="card p-5 flex flex-wrap items-center gap-4">
        <Avatar name={p.full_name} url={p.avatar_url} size={56} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold">{p.full_name || "Sem nome"}</h1>
          <p className="text-sm text-muted">{p.email} · desde {formatDate(p.created_at)} · {posts ?? 0} posts</p>
        </div>
        {p.id !== user.id && (
          <form action={setRole}>
            <input type="hidden" name="user_id" value={p.id} />
            <input type="hidden" name="role" value={p.role === "admin" ? "student" : "admin"} />
            <ConfirmButton variant="secondary" message={p.role === "admin" ? "Remover privilégios de administrador?" : "Tornar este usuário administrador? Ele terá acesso total."}>
              {p.role === "admin" ? "Remover admin" : "Tornar admin"}
            </ConfirmButton>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="h-section mb-3">Cursos liberados</h2>
          <ul className="divide-y divide-slate-100">
            {(enrollments ?? []).map((e) => (
              <li key={e.id} className="py-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium">{(e.courses as unknown as { title: string } | null)?.title}</p>
                  <p className="text-xs text-muted">
                    {e.source === "purchase" ? `Compra${e.order_id ? ` #${e.order_id}` : ""}` : "Liberado pelo admin"} · {formatDate(e.created_at)}
                  </p>
                </div>
                <form action={revokeEnrollment}>
                  <input type="hidden" name="id" value={e.id} />
                  <ConfirmButton message="Remover o acesso a este curso?" className="btn-sm">Remover</ConfirmButton>
                </form>
              </li>
            ))}
            {!enrollments?.length && <li className="py-3 text-sm text-muted">Nenhum curso liberado.</li>}
          </ul>
        </section>
        {available.length > 0 && <GrantForm courses={available} email={p.email} name={p.full_name} />}
      </div>
    </div>
  );
}
