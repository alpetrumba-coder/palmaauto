"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { carBookingOverlapWhere } from "@/lib/booking-overlap";
import { prisma } from "@/lib/prisma";
import { inclusiveRentalDays, parseDateInput, utcToday } from "@/lib/rental-dates";

export type BookingCheckoutActionResult = { ok: true; bookingId: string } | { ok: false; error: string };

function trimStr(s: string, max: number): string {
  return s.trim().slice(0, max);
}

/**
 * Сохраняет контактные данные клиента и создаёт бронь (ожидает оплаты).
 * Реальной оплаты пока нет — статус PENDING_PAYMENT.
 */
export async function submitBookingCheckoutAction(input: {
  carId: string;
  startDate: string;
  endDate: string;
  firstName: string;
  lastName: string;
  passportData: string;
  phone: string;
}): Promise<BookingCheckoutActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Войдите в аккаунт, чтобы оформить бронь." };
  }

  const firstName = trimStr(input.firstName, 120);
  const lastName = trimStr(input.lastName, 120);
  const passportData = trimStr(input.passportData, 4000);
  const phone = trimStr(input.phone, 40);

  if (!firstName || !lastName) {
    return { ok: false, error: "Укажите имя и фамилию." };
  }
  if (!passportData) {
    return { ok: false, error: "Укажите паспортные данные." };
  }
  if (!phone) {
    return { ok: false, error: "Укажите телефон." };
  }

  const start = parseDateInput(input.startDate);
  const end = parseDateInput(input.endDate);
  if (!start || !end) {
    return { ok: false, error: "Укажите корректные даты." };
  }
  if (end < start) {
    return { ok: false, error: "Дата окончания не раньше даты начала." };
  }

  const today = utcToday();
  if (start < today) {
    return { ok: false, error: "Нельзя бронировать даты в прошлом." };
  }

  const days = inclusiveRentalDays(start, end);
  if (days < 1 || days > 90) {
    return { ok: false, error: "Некорректный срок брони." };
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
    return { ok: false, error: "Эти даты уже заняты. Обновите страницу и выберите другой период." };
  }

  const totalPriceRub = days * car.pricePerDayRub;

  const booking = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user.id },
      data: {
        firstName,
        lastName,
        passportData,
        phone,
      },
    });
    return tx.booking.create({
      data: {
        userId: session.user.id,
        carId: input.carId,
        startDate: start,
        endDate: end,
        status: "PENDING_PAYMENT",
        totalPriceRub,
      },
    });
  });

  revalidatePath("/moi-broni");
  revalidatePath("/account");
  revalidatePath("/book");
  revalidatePath(`/cars/${car.slug}`);
  revalidatePath("/admin-panel/bookings");
  revalidatePath("/bronirovanie");
  revalidatePath("/");
  revalidatePath(`/oplata/${booking.id}`);

  return { ok: true, bookingId: booking.id };
}
