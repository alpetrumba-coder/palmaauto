import { prisma } from "@/lib/prisma";

/** Порядок карточек на главной. */
export const HOME_CAR_SLUG_ORDER = ["nissan-note", "toyota-prius", "toyota-estima", "toyota-crown"] as const;

export type ActiveCar = Awaited<ReturnType<typeof getActiveCars>>[number];

/** Сортировка для главной: Note → Prius → Estima → Crown, остальные в конце. */
export function sortCarsForHomepage<T extends { slug: string }>(cars: T[]): T[] {
  const rank = new Map<string, number>(HOME_CAR_SLUG_ORDER.map((slug, index) => [slug, index]));
  return [...cars].sort((a, b) => {
    const aRank = rank.get(a.slug) ?? HOME_CAR_SLUG_ORDER.length;
    const bRank = rank.get(b.slug) ?? HOME_CAR_SLUG_ORDER.length;
    if (aRank !== bRank) return aRank - bRank;
    return a.slug.localeCompare(b.slug, "ru");
  });
}

/** Активные машины для публичного каталога, с фото по порядку. */
export function getActiveCars() {
  return prisma.car.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { make: "asc" }, { model: "asc" }],
    include: {
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
}

/** Одна активная машина по slug или null. */
export function getActiveCarBySlug(slug: string) {
  return prisma.car.findFirst({
    where: { slug, active: true },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
}
