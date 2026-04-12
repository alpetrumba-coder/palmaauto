"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { carBookingOverlapWhere } from "@/lib/booking-overlap";
import { prisma } from "@/lib/prisma";
import { inclusiveRentalDays, parseDateInput, utcToday } from "@/lib/rental-dates";

export type BookingActionResult =
  | { ok: true; bookingId?: string }
  | { ok: false; error: string };

export async function createBookingAction(input: {
  carId: string;
  startDate: string;
  endDate: string;
}): Promise<BookingActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Войдите в аккаунт, чтобы забронировать." };
  }

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
    return { ok: false, error: "Нельзя бронировать даты в прошлом." };
  }

  if (days > 90) {
    return { ok: false, error: "Максимальный срок брони — 90 суток." };
  }

  const car = await prisma.car.findFirst({
    where: { id: input.carId, active: true },
  });
  if (!car) {
    return { ok: false, error: "Автомобиль недоступен." };
  }

  const overlap = await prisma.booking.findFirst({
    where: carBookingOverlapWhere(input.carId, start, end),
  });

  if (overlap) {
    return { ok: false, error: "Выбранные даты пересекаются с другой бронью. Выберите другой период." };
  }

  const totalPriceRub = days * car.pricePerDayRub;

  const created = await prisma.booking.create({
    data: {
      userId: session.user.id,
      carId: input.carId,
      startDate: start,
      endDate: end,
      status: "PENDING_PAYMENT",
      totalPriceRub,
    },
  });

  revalidatePath("/account");
  revalidatePath("/book");
  revalidatePath(`/cars/${car.slug}`);
  revalidatePath("/admin-panel/bookings");
  revalidatePath(`/oplata/${created.id}`);

  return { ok: true, bookingId: created.id };
}

export async function cancelBookingAction(bookingId: string): Promise<BookingActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Войдите в аккаунт." };
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId: session.user.id },
    include: { car: true },
  });

  if (!booking) {
    return { ok: false, error: "Бронь не найдена." };
  }

  if (booking.status !== "PENDING_PAYMENT") {
    return { ok: false, error: "Отменить можно только бронь в статусе «ожидает оплаты»." };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/account");
  revalidatePath("/book");
  revalidatePath("/admin-panel/bookings");
  revalidatePath(`/oplata/${bookingId}`);
  revalidatePath(`/oplata/${bookingId}/checkout`);
  revalidatePath("/bronirovanie");
  if (booking.car) {
    revalidatePath(`/cars/${booking.car.slug}`);
  }

  return { ok: true };
}
