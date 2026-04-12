"use server";

import { revalidatePath } from "next/cache";

import { carBookingOverlapWhere } from "@/lib/booking-overlap";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";
import { inclusiveRentalDays, parseDateInput, utcToday } from "@/lib/rental-dates";
import type { BookingStatus } from "@prisma/client";

export type AdminBookingActionResult = { ok: true } | { ok: false; error: string };

/**
 * Создание брони менеджером: тот же расчёт цены и проверка пересечений, что у клиента на сайте.
 */
export async function createAdminBookingAction(input: {
  userId: string;
  carId: string;
  startDate: string;
  endDate: string;
  /** По умолчанию «ожидает оплаты»; можно сразу отметить оплаченной. */
  status: "PENDING_PAYMENT" | "PAID";
}): Promise<AdminBookingActionResult> {
  await requireAdminPanelSession();

  const start = parseDateInput(input.startDate);
  const end = parseDateInput(input.endDate);
  if (!start || !end) {
    return { ok: false, error: "Укажите корректные даты." };
  }

  if (end < start) {
    return { ok: false, error: "Дата окончания не раньше даты начала." };
  }

  const days = inclusiveRentalDays(start, end);
  if (days < 1) {
    return { ok: false, error: "Некорректный период." };
  }

  const today = utcToday();
  if (start < today) {
    return { ok: false, error: "Нельзя создать бронь с датой начала в прошлом." };
  }

  if (days > 90) {
    return { ok: false, error: "Максимальный срок брони — 90 суток." };
  }

  const [user, car] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.userId } }),
    prisma.car.findUnique({ where: { id: input.carId } }),
  ]);

  if (!user) {
    return { ok: false, error: "Пользователь не найден." };
  }
  if (!car) {
    return { ok: false, error: "Автомобиль не найден." };
  }

  const overlap = await prisma.booking.findFirst({
    where: carBookingOverlapWhere(input.carId, start, end),
  });

  if (overlap) {
    return { ok: false, error: "Эти даты пересекаются с другой активной бронью по этой машине." };
  }

  const totalPriceRub = days * car.pricePerDayRub;

  const status: BookingStatus = input.status === "PAID" ? "PAID" : "PENDING_PAYMENT";

  await prisma.booking.create({
    data: {
      userId: input.userId,
      carId: input.carId,
      startDate: start,
      endDate: end,
      status,
      totalPriceRub,
    },
  });

  revalidatePath("/account");
  revalidatePath("/book");
  revalidatePath(`/cars/${car.slug}`);
  revalidatePath("/admin-panel/bookings");

  return { ok: true };
}
