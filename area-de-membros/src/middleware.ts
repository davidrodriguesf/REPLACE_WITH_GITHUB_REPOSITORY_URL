import { NextResponse, type NextRequest } from "next/server";
import { publicUrl } from "@/lib/public-url";

// Páginas abertas sem login. A sessão é validada de verdade no servidor (requireUser).
const PUBLIC = ["/login", "/esqueci-senha", "/auth", "/certificado", "/primeiro-acesso", "/arquivos", "/api/asaas"];


export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p + "/"));
  const hasSession = !!request.cookies.get("sid")?.value;
  if (!hasSession && !isPublic) {
    const target = path + request.nextUrl.search;
    // endereço público (domínio do nginx), nunca o interno 127.0.0.1:porta
    return NextResponse.redirect(publicUrl(request.headers, path !== "/" ? `/login?next=${encodeURIComponent(target)}` : "/login"));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
