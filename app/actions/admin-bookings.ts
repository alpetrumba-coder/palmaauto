"use server";

import { revalidatePath } from "next/cache";

import { syncCarDealSafe } from "@/lib/car-deals";

import {
  parseAdminBookingGuest,
  type AdminBookingGuestInput,
} from "@/lib/admin-booking-guest";
import { carBookingOverlapWhere } from "@/lib/booking-overlap";
import { formatBookingGuestLabel } from "@/lib/booking-display";
import { sendAdminBookingCreatedEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";
import { inclusiveRentalDays, parseDateInput, utcToday } from "@/lib/rental-dates";
import {
  resolveBookingPayment,
  type AdminBookingPaymentStatus,
} from "@/lib/admin-booking-payment";

export type AdminBookingActionResult = { ok: true } | { ok: false; error: string };

export type { AdminBookingPaymentStatus };

/**
 * Создание брони менеджером: данные туриста в самой карточке заказа, без отдельного пользователя.
 */
export async function createAdminBookingAction(input: {
  guest: AdminBookingGuestInput;
  carId: string;
  startDate: string;
  endDate: string;
  totalPriceRub: number;
  paidAmountRub: number;
  status: AdminBookingPaymentStatus;
}): Promise<AdminBookingActionResult> {
  await requireAdminPanelSession();

  const guestParsed = parseAdminBookingGuest(input.guest);
  if (!guestParsed.ok) {
    return guestParsed;
  }
  const { guest } = guestParsed;

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

  const totalPriceRub = Math.round(input.totalPriceRub);
  if (!Number.isFinite(totalPriceRub) || totalPriceRub <= 0) {
    return { ok: false, error: "Укажите общую сумму заказа (целое число больше 0)." };
  }

  const paidInput = Math.max(0, Math.round(input.paidAmountRub));
  const payment = resolveBookingPayment(input.status, totalPriceRub, paidInput);
  if (!payment.ok) {
    return payment;
  }

  const car = await prisma.car.findUnique({ where: { id: input.carId } });
  if (!car) {
    return { ok: false, error: "Автомобиль не найден." };
  }

  const minDays = Math.max(1, Math.min(90, car.minRentalDays ?? 1));
  if (days < minDays) {
    return { ok: false, error: `Минимальный срок аренды для этой машины — ${minDays} сут.` };
  }

  const overlap = await prisma.booking.findFirst({
    where: carBookingOverlapWhere(input.carId, start, end),
  });

  if (overlap) {
    return { ok: false, error: "Эти даты пересекаются с другой активной бронью по этой машине." };
  }

  const created = await prisma.booking.create({
    data: {
      carId: input.carId,
      startDate: start,
      endDate: end,
      status: payment.status,
      paymentPlan: "FULL",
      paidAmountRub: payment.paidAmountRub,
      totalPriceRub,
      isTest: car.isTest,
      ...guest,
    },
  });

  try {
    await sendAdminBookingCreatedEmail({
      bookingId: created.id,
      status: created.status,
      startDate: created.startDate,
      endDate: created.endDate,
      days,
      totalPriceRub: created.totalPriceRub,
      car: { make: car.make, model: car.model, slug: car.slug },
      guest: {
        label: formatBookingGuestLabel(guest),
        phone: guest.guestPhone,
        messenger: guest.guestMessenger,
      },
    });
  } catch (e) {
    console.warn("[admin-booking] admin email failed:", e);
  }

  await syncCarDealSafe(created.id);
  revalidatePath("/moi-broni");
  revalidatePath("/account");
  revalidatePath("/book");
  revalidatePath(`/cars/${car.slug}`);
  revalidatePath("/admin-panel/bookings");
  revalidatePath("/admin-panel/orders");

  return { ok: true };
}
