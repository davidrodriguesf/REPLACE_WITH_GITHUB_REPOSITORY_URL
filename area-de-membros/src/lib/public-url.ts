/**
 * Endereço público do site (ex.: https://academia.pestx.com.br).
 * Atrás do nginx, o Next enxerga o endereço interno (127.0.0.1:porta), então usamos
 * os cabeçalhos que o nginx envia (Host / X-Forwarded-*) e, na falta, NEXT_PUBLIC_SITE_URL.
 */
export function publicOrigin(headers: Headers) {
  const host = headers.get("x-forwarded-host")?.split(",")[0]?.trim() || headers.get("host");
  if (host && !/^(127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?$/.test(host)) {
    const proto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function publicUrl(headers: Headers, path: string) {
  return new URL(path, publicOrigin(headers));
}
