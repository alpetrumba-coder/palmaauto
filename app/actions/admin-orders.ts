"use server";

import { revalidatePath } from "next/cache";

import { type AdminUserProfilePayload, updateAdminUserAction } from "@/app/actions/admin-users";
import { carBookingOverlapWhere } from "@/lib/booking-overlap";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";
import { inclusiveRentalDays, parseDateInput } from "@/lib/rental-dates";
import type { BookingStatus } from "@prisma/client";

export type AdminOrderActionResult = { ok: true } | { ok: false; error: string };

function deriveStatusAfterPaymentUpdate(
  paidAmountRub: number,
  totalPriceRub: number,
  previous: BookingStatus,
): BookingStatus {
  if (previous === "CANCELLED") return "CANCELLED";
  if (paidAmountRub <= 0) {
    return previous === "PAID" || previous === "PARTIALLY_PAID" ? "PENDING_PAYMENT" : previous;
  }
  if (paidAmountRub >= totalPriceRub) return "PAID";
  return "PARTIALLY_PAID";
}

export async function updateAdminOrderAction(input: {
  bookingId: string;
  carId: string;
  startDate: string;
  endDate: string;
  paidAmountRub: number;
  user: AdminUserProfilePayload;
}): Promise<AdminOrderActionResult> {
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
  if (days > 90) {
    return { ok: false, error: "Максимальный срок брони — 90 суток." };
  }

  const paidAmountRub = Math.max(0, Math.round(input.paidAmountRub));

  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: { car: true },
  });

  if (!booking) {
    return { ok: false, error: "Заказ не найден." };
  }
  if (booking.status === "CANCELLED") {
    return { ok: false, error: "Отменённый заказ нельзя редактировать." };
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
    where: {
      AND: [carBookingOverlapWhere(input.carId, start, end), { id: { not: booking.id } }],
    },
  });
  if (overlap) {
    return { ok: false, error: "Эти даты пересекаются с другой активной бронью по этой машине." };
  }

  const userRes = await updateAdminUserAction(booking.userId, input.user);
  if (!userRes.ok) {
    return userRes;
  }

  const totalPriceRub = days * car.pricePerDayRub;
  const status = deriveStatusAfterPaymentUpdate(paidAmountRub, totalPriceRub, booking.status);

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      carId: input.carId,
      startDate: start,
      endDate: end,
      paidAmountRub,
      totalPriceRub,
      status,
    },
  });

  revalidateOrderPaths(car.slug);
  if (car.slug !== booking.car.slug) {
    revalidateOrderPaths(booking.car.slug);
  }
  revalidatePath(`/admin-panel/orders/${booking.id}/edit`);
  revalidatePath("/admin-panel/users");
  revalidatePath(`/admin-panel/users/${booking.userId}/edit`);

  return { ok: true };
}

export async function cancelAdminOrderAction(
  bookingId: string,
): Promise<AdminOrderActionResult> {
  await requireAdminPanelSession();

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { car: true },
  });

  if (!booking) {
    return { ok: false, error: "Заказ не найден." };
  }
  if (booking.status === "CANCELLED") {
    return { ok: false, error: "Заказ уже отменён." };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  revalidateOrderPaths(booking.car.slug);
  revalidatePath(`/admin-panel/orders/${bookingId}/edit`);

  return { ok: true };
}

function revalidateOrderPaths(carSlug: string) {
  revalidatePath("/admin-panel/bookings");
  revalidatePath("/admin-panel/orders");
  revalidatePath("/moi-broni");
  revalidatePath("/account");
  revalidatePath("/book");
  revalidatePath("/bronirovanie");
  revalidatePath(`/cars/${carSlug}`);
  revalidatePath("/");
}
