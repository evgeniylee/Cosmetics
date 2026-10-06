import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Драйверы БД работают только на сервере и не бандлятся (PGlite тянет WASM).
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
};

export default nextConfig;
