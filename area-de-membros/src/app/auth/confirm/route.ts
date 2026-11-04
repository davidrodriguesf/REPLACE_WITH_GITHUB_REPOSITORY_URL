import { NextResponse, type NextRequest } from "next/server";
import { consumeEmailToken, createSession } from "@/lib/db/auth";
import { publicUrl } from "@/lib/public-url";

/** Link do e-mail (convite ou redefinição): valida o token, cria a sessão e leva para criar a senha. */
export async function GET(req: NextRequest) {
  // endereço público (domínio do nginx), nunca o interno 127.0.0.1:porta
  const go = (path: string) => NextResponse.redirect(publicUrl(req.headers, path), 303);
  const { searchParams } = req.nextUrl;
  const token = searchParams.get("token");
  const nextParam = searchParams.get("next") || "/definir-senha";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/definir-senha";
  if (token) {
    const userId = await consumeEmailToken(token);
    if (userId) {
      await createSession(userId);
      return go(next);
    }
  }
  return go("/login?erro=link");
}
