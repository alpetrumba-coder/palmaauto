"use server";

import { revalidatePath } from "next/cache";

import { isValidCarImageSrc } from "@/lib/carImageSrc";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";
import { prisma } from "@/lib/prisma";

export type CarImageInput = { url: string; alt: string };

export type CarFormPayload = {
  slug: string;
  make: string;
  model: string;
  description: string;
  pricePerDayRub: number;
  active: boolean;
  images: CarImageInput[];
};

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validatePayload(p: CarFormPayload): string | null {
  const slug = normalizeSlug(p.slug);
  if (!slug || !SLUG_REGEX.test(slug)) {
    return "Slug: только латиница, цифры и дефисы, например toyota-camry.";
  }
  if (!p.make.trim() || !p.model.trim()) {
    return "Укажите марку и модель.";
  }
  if (!p.description.trim()) {
    return "Укажите описание.";
  }
  if (!Number.isFinite(p.pricePerDayRub) || p.pricePerDayRub < 1 || p.pricePerDayRub > 1_000_000_000) {
    return "Цена за сутки — положительное целое число (руб.).";
  }
  const imgs = p.images.filter((i) => i.url.trim().length > 0);
  if (imgs.length === 0) {
    return "Добавьте хотя бы одно фото: путь /cars/..., https или загрузка с диска.";
  }
  for (const img of imgs) {
    if (!isValidCarImageSrc(img.url)) {
      return "Некорректный адрес фото: путь /cars/..., https или результат загрузки (data:image/...).";
    }
  }
  return null;
}

export async function createCarAction(payload: CarFormPayload): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminPanelSession();
  const err = validatePayload(payload);
  if (err) return { ok: false, error: err };

  const slug = normalizeSlug(payload.slug);
  const images = payload.images.filter((i) => i.url.trim().length > 0);

  const exists = await prisma.car.findUnique({ where: { slug } });
  if (exists) {
    return { ok: false, error: "Автомобиль с таким slug уже есть." };
  }

  await prisma.car.create({
    data: {
      slug,
      make: payload.make.trim(),
      model: payload.model.trim(),
      description: payload.description.trim(),
      pricePerDayRub: Math.round(payload.pricePerDayRub),
      active: payload.active,
      images: {
        create: images.map((img, index) => ({
          url: img.url.trim(),
          alt: img.alt.trim() || null,
          sortOrder: index,
        })),
      },
    },
  });

  revalidatePath("/cars");
  revalidatePath("/");
  revalidatePath(`/cars/${slug}`);

  return { ok: true };
}

export async function updateCarAction(
  carId: string,
  payload: CarFormPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminPanelSession();
  const err = validatePayload(payload);
  if (err) return { ok: false, error: err };

  const slug = normalizeSlug(payload.slug);
  const images = payload.images.filter((i) => i.url.trim().length > 0);

  const existing = await prisma.car.findUnique({ where: { id: carId } });
  if (!existing) {
    return { ok: false, error: "Запись не найдена." };
  }

  if (slug !== existing.slug) {
    const other = await prisma.car.findUnique({ where: { slug } });
    if (other) {
      return { ok: false, error: "Другой автомобиль уже использует этот slug." };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.car.update({
      where: { id: carId },
      data: {
        slug,
        make: payload.make.trim(),
        model: payload.model.trim(),
        description: payload.description.trim(),
        pricePerDayRub: Math.round(payload.pricePerDayRub),
        active: payload.active,
      },
    });
    await tx.carImage.deleteMany({ where: { carId } });
    await tx.carImage.createMany({
      data: images.map((img, index) => ({
        carId,
        url: img.url.trim(),
        alt: img.alt.trim() || null,
        sortOrder: index,
      })),
    });
  });

  revalidatePath("/cars");
  revalidatePath("/");
  revalidatePath(`/cars/${existing.slug}`);
  if (slug !== existing.slug) {
    revalidatePath(`/cars/${slug}`);
  }

  return { ok: true };
}

export async function deleteCarAction(carId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminPanelSession();

  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car) {
    return { ok: false, error: "Запись не найдена." };
  }

  await prisma.car.delete({ where: { id: carId } });

  revalidatePath("/cars");
  revalidatePath("/");
  revalidatePath(`/cars/${car.slug}`);

  return { ok: true };
}
