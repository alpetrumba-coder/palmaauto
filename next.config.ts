import type { NextConfig } from "next";

/**
 * Конфигурация Next.js.
 * remotePatterns — внешние URL фото в каталоге (сиды и позже S3 с публичным URL).
 */
const nextConfig: NextConfig = {
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
