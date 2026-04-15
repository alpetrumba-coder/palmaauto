"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import type { ContractFormInput } from "@/lib/booking-contract";
import { validateContractForm } from "@/lib/booking-contract";
import { carBookingOverlapWhere } from "@/lib/booking-overlap";
import { prisma } from "@/lib/prisma";
import { splitRuFullName } from "@/lib/ru-full-name";
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
  phone: string;
  contract: ContractFormInput;
}): Promise<BookingCheckoutActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Войдите в аккаунт, чтобы оформить бронь." };
  }

  const phone = trimStr(input.phone, 40);
  if (!phone) {
    return { ok: false, error: "Укажите телефон." };
  }

  const contractRes = validateContractForm(input.contract);
  if (!contractRes.ok) {
    return { ok: false, error: contractRes.error };
  }
  const meta = contractRes.meta;
  const metaJson = meta as unknown as Prisma.InputJsonValue;

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

  if (
    !car.modelYear ||
    !car.color?.trim() ||
    !car.plateNumber?.trim() ||
    !car.registrationCertificate?.trim()
  ) {
    return {
      ok: false,
      error:
        "По этому автомобилю не заполнены данные для договора (год, цвет, гос. номер, СТС). Выберите другой автомобиль или свяжитесь с офисом.",
    };
  }

  const minDays = Math.max(1, Math.min(90, car.minRentalDays ?? 1));
  if (days < minDays) {
    return { ok: false, error: `Минимальный срок аренды для этого автомобиля — ${minDays} сут.` };
  }

  const overlap = await prisma.booking.findFirst({
    where: carBookingOverlapWhere(input.carId, start, end),
  });
  if (overlap) {
    return { ok: false, error: "Эти даты уже заняты. Обновите страницу и выберите другой период." };
  }

  const totalPriceRub = days * car.pricePerDayRub;

  const passportData = trimStr(`${meta.passportSeries} ${meta.passportNumber}, ${meta.passportIssuedBy}`, 4000);
  const { lastName, firstName, patronymic } = splitRuFullName(meta.fullName);

  const booking = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user.id },
      data: {
        firstName,
        lastName,
        patronymic,
        passportData,
        phone,
        birthYear: meta.birthYear,
        ageYears: meta.ageYears,
        passportSeries: meta.passportSeries,
        passportNumber: meta.passportNumber,
        passportIssuedBy: meta.passportIssuedBy,
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
        contractMeta: metaJson,
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
