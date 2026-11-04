import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/db/server";
import { getReport, rowDone } from "@/lib/reports";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Planilha colaborador × curso (separador ";" para abrir direto no Excel em português). */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const funcao = req.nextUrl.searchParams.get("funcao");
  const depto = req.nextUrl.searchParams.get("depto");
  const [{ data: people }, { data: roles }, rows] = await Promise.all([
    supabase.from("profiles").select("*").eq("is_active", true),
    supabase.from("job_roles").select("id, name"),
    getReport(supabase),
  ]);
  const roleName = new Map((roles ?? []).map((r) => [r.id as string, r.name as string]));
  const pmap = new Map(((people ?? []) as Profile[]).filter((p) => (!funcao || p.job_role_id === funcao) && (!depto || p.department === depto)).map((p) => [p.id, p]));

  const header = ["Colaborador", "E-mail", "Função", "Departamento", "Curso", "Origem", "Aulas concluídas", "Total de aulas", "Progresso %", "Concluído", "Melhor nota na prova", "Aprovado", "Certificado", "Prazo", "Última atividade"];
  const lines = [header.join(";")];
  for (const r of rows) {
    const p = pmap.get(r.user_id);
    if (!p) continue;
    lines.push([
      p.full_name, p.email, (p.job_role_id && roleName.get(p.job_role_id)) || "", p.department ?? "", r.title,
      r.in_trail ? "Trilha" : r.assigned ? "Atribuído" : "Livre", r.done_lessons, r.total_lessons,
      r.total_lessons ? Math.round((r.done_lessons / r.total_lessons) * 100) : 0, rowDone(r) ? "Sim" : "Não",
      r.best_exam ?? "", r.exam_passed == null ? "" : r.exam_passed ? "Sim" : "Não", r.certificate_id ? "Sim" : "Não",
      r.due_date ?? "", r.last_activity ? new Date(r.last_activity).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "",
    ].map(esc).join(";"));
  }
  return new NextResponse("﻿" + lines.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="relatorio-aprendizagem.csv"` },
  });
}
