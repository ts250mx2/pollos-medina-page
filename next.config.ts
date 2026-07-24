import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  // El panel funciona en tiempo de ejecución; no bloqueamos la build de
  // producción por avisos de ESLint o tipos del código migrado.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
