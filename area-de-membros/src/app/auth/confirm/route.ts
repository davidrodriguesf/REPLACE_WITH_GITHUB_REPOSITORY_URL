import { NextResponse, type NextRequest } from "next/server";
import { consumeEmailToken, createSession } from "@/lib/db/auth";

/** Link do e-mail (convite ou redefinição): valida o token, cria a sessão e leva para criar a senha. */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const token = searchParams.get("token");
  const nextParam = searchParams.get("next") || "/definir-senha";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/definir-senha";
  if (token) {
    const userId = await consumeEmailToken(token);
    if (userId) {
      await createSession(userId);
      return NextResponse.redirect(new URL(next, origin));
    }
  }
  return NextResponse.redirect(new URL("/login?erro=link", origin));
}
