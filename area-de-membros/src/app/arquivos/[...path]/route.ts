import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { MIME, PUBLIC_EXT, UPLOAD_ROOT } from "@/lib/uploads";
import { sessionUserId } from "@/lib/db/auth";

// Imagens (capas, fotos, logo, assinatura) são públicas; PDFs e documentos exigem login.
export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  const ok = parts.length === 2 && /^[a-z0-9-]{1,64}$/.test(parts[0]!) && /^[0-9a-f-]{36}\.(png|jpg|webp|gif|pdf|docx|xlsx|pptx)$/.test(parts[1]!);
  if (!ok) return new Response("Não encontrado", { status: 404 });
  const ext = parts[1]!.split(".").pop()!;
  if (!PUBLIC_EXT.has(ext) && !(await sessionUserId())) return new Response("Entre na Academia para abrir este arquivo.", { status: 401 });
  const file = path.join(UPLOAD_ROOT, parts[0]!, parts[1]!);
  try {
    const [buf, st] = await Promise.all([readFile(file), stat(file)]);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Content-Length": String(st.size),
        "Cache-Control": PUBLIC_EXT.has(ext) ? "public, max-age=31536000, immutable" : "private, max-age=3600",
        "Content-Disposition": ext === "pdf" || PUBLIC_EXT.has(ext) ? "inline" : "attachment",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
}
