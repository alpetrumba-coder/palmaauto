import type { NextConfig } from "next";

/**
 * Конфигурация Next.js.
 * Локальные фото каталога: файлы в public/cars/..., в БД путь вида /cars/... (remotePatterns не нужны).
 * remotePatterns — только если в админке указаны внешние https:// URL (CDN, S3 и т.д.).
 */
const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
