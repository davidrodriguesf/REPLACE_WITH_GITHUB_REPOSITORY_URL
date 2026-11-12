import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera .next/standalone (server.js + dependências mínimas) para rodar na VPS com "node server.js"
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  experimental: {
    // envio de capas, PDFs e assinaturas pelos formulários
    serverActions: { bodySizeLimit: "60mb" },
    middlewareClientMaxBodySize: "60mb",
  },
};

export default nextConfig;
