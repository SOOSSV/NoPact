import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Plusieurs lockfiles dans l'arborescence : on fixe la racine explicitement.
  turbopack: { root: __dirname },
};

export default nextConfig;
