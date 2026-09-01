import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  // El panel funciona en tiempo de ejecución; no bloqueamos la build de
  // producción por avisos de ESLint o tipos del código migrado.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  webpack: (config, { isServer, nextRuntime }) => {
    // El scheduler de Wansoft (instrumentation) usa módulos de Node
    // (child_process/fs/path). Solo corre en el runtime nodejs; en los demás
    // bundles (edge/cliente) se marcan como vacíos para que webpack no falle
    // al empaquetarlos (nunca se ejecutan ahí por el guard de runtime).
    if (!(isServer && nextRuntime === "nodejs")) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        child_process: false,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
