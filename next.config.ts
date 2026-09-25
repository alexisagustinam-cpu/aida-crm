import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (base local de desarrollo) trae archivos WASM: se carga desde node_modules, sin empaquetar.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
