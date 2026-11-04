import { NextResponse, type NextRequest } from "next/server";

// Páginas abertas sem login. A sessão é validada de verdade no servidor (requireUser).
const PUBLIC = ["/login", "/esqueci-senha", "/auth", "/certificado", "/primeiro-acesso"];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p + "/"));
  const hasSession = !!request.cookies.get("sid")?.value;
  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = path !== "/" ? `?next=${encodeURIComponent(path)}` : "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
