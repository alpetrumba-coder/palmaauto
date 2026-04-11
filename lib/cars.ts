import { prisma } from "@/lib/prisma";

/** Активные машины для публичного каталога, с фото по порядку. */
export function getActiveCars() {
  return prisma.car.findMany({
    where: { active: true },
    orderBy: [{ make: "asc" }, { model: "asc" }],
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
