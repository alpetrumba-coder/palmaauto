import { carBookingOverlapWhere } from "@/lib/booking-overlap";
import { prisma } from "@/lib/prisma";
import { inclusiveRentalDays, parseDateInput, utcToday } from "@/lib/rental-dates";

export type BookingCheckoutPreview =
  | {
      ok: true;
      car: {
        id: string;
        slug: string;
        make: string;
        model: string;
        pricePerDayRub: number;
        coverUrl: string | null;
        coverAlt: string | null;
      };
      days: number;
      totalPriceRub: number;
      fromStr: string;
      toStr: string;
    }
  | { ok: false; error: string };

/** Проверка дат, машины и отсутствия пересечений для страницы оформления брони. */
export async function getBookingCheckoutPreview(
  carSlug: string,
  fromStr: string,
  toStr: string,
): Promise<BookingCheckoutPreview> {
  const from = fromStr.trim();
  const to = toStr.trim();
  if (!from || !to) {
    return { ok: false, error: "Укажите даты начала и окончания в адресе страницы." };
  }

  const start = parseDateInput(from);
  const end = parseDateInput(to);
  if (!start || !end) {
    return { ok: false, error: "Укажите корректные даты." };
  }
  if (end < start) {
    return { ok: false, error: "Дата окончания не может быть раньше даты начала." };
  }

  const today = utcToday();
  if (start < today) {
    return { ok: false, error: "Нельзя оформить бронь на даты в прошлом." };
  }

  const days = inclusiveRentalDays(start, end);
  if (days < 1) {
    return { ok: false, error: "Некорректный период." };
  }
  if (days > 90) {
    return { ok: false, error: "Максимальный срок брони — 90 суток." };
  }

  const carRow = await prisma.car.findFirst({
    where: { slug: carSlug.trim(), active: true },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });

  if (!carRow) {
    return { ok: false, error: "Автомобиль не найден или снят с витрины." };
  }

  const overlap = await prisma.booking.findFirst({
    where: carBookingOverlapWhere(carRow.id, start, end),
  });

  if (overlap) {
    return {
      ok: false,
      error: "На эти даты автомобиль уже занят. Выберите другой период или машину.",
    };
  }

  const cover = carRow.images[0];
  const totalPriceRub = days * carRow.pricePerDayRub;

  return {
    ok: true,
    car: {
      id: carRow.id,
      slug: carRow.slug,
      make: carRow.make,
      model: carRow.model,
      pricePerDayRub: carRow.pricePerDayRub,
      coverUrl: cover?.url ?? null,
      coverAlt: cover?.alt ?? null,
    },
    days,
    totalPriceRub,
    fromStr: from,
    toStr: to,
  };
}
