import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_NAME } from "@/lib/utils";

// Tudo é gerado na hora (dados por usuário): o servidor nunca precisa gravar cache em disco.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: "Universidade corporativa: trilhas, cursos, avaliações, certificados e comunidade",
  robots: { index: false },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
