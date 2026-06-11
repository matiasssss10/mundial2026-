/** @type {import('next').NextConfig} */
const config = {
  experimental: { serverComponentsExternalPackages: ["better-sqlite3"] },
  webpack: (cfg, { isServer }) => {
    if (isServer) cfg.externals = [...(cfg.externals || []), "better-sqlite3"];
    return cfg;
  },
};
export default config;
