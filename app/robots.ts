import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/admin-panel",
          "/api",
          "/oplata",
          "/account",
          "/moi-broni",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: "https://palmaauto.ru/sitemap.xml",
    host: "https://palmaauto.ru",
  };
}

