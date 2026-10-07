import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Драйверы БД работают только на сервере и не бандлятся (PGlite тянет WASM).
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // Фото товаров из админки идут через server action; по умолчанию лимит 1 МБ.
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
};

export default nextConfig;
