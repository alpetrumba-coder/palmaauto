import type { MetadataRoute } from "next";

import { getActiveCars } from "@/lib/cars";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://palmaauto.ru";
  const cars = await getActiveCars();
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/cars`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/arenda-avto-abkhazia`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/arenda-avto-sukhum`, lastModified: now, changeFrequency: "weekly", priority: 0.75 },
    { url: `${base}/arenda-avto-gagra`, lastModified: now, changeFrequency: "weekly", priority: 0.75 },
    { url: `${base}/arenda-avto-na-granice`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/deshevyy-prokat-avto-abkhazia`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/conditions`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/policy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/consent`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/o-kompanii`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/poryadok-zakaza`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const carUrls: MetadataRoute.Sitemap = cars.map((c) => ({
    url: `${base}/cars/${c.slug}`,
    lastModified: c.updatedAt ?? now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticUrls, ...carUrls];
}

