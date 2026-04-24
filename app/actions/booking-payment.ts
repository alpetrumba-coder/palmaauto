"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { isPendingPaymentHoldActive } from "@/lib/booking-hold";
import { prisma } from "@/lib/prisma";
import { inclusiveRentalDays } from "@/lib/rental-dates";

export type FakePaymentPlan = "FULL" | "FIRST_DAY";
export type FakePaymentResult = { ok: true } | { ok: false; error: string };

/** Имитация успешной оплаты (позже — реальный платёжный провайдер). */
export async function completeFakePaymentAction(bookingId: string, plan: FakePaymentPlan): Promise<FakePaymentResult> {
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
    return { ok: false, error: "Для этой брони оплата недоступна." };
  }

  if (!isPendingPaymentHoldActive(booking.createdAt)) {
    return { ok: false, error: "Время на оплату истекло. Оформите бронь заново." };
  }

  const days = inclusiveRentalDays(booking.startDate, booking.endDate);
  const safeDays = Math.max(1, days);
  const secondDriverPerDayRub = booking.secondDriverEnabled ? Math.round(booking.secondDriverFeeRub / safeDays) : 0;
  const childSeatPerDayRub = booking.childSeatEnabled ? Math.round(booking.childSeatFeeRub / safeDays) : 0;
  const firstDayAmountRub =
    booking.car.pricePerDayRub +
    booking.pickupFeeRub +
    booking.dropoffFeeRub +
    secondDriverPerDayRub +
    childSeatPerDayRub;

  const normalizedPlan: FakePaymentPlan = plan === "FIRST_DAY" ? "FIRST_DAY" : "FULL";
  const paidAmountRub = normalizedPlan === "FIRST_DAY" ? firstDayAmountRub : booking.totalPriceRub;
  const nextStatus = normalizedPlan === "FIRST_DAY" ? "PARTIALLY_PAID" : "PAID";

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: nextStatus,
      paymentPlan: normalizedPlan === "FIRST_DAY" ? "FIRST_DAY" : "FULL",
      paidAmountRub,
    },
  });

  revalidatePath("/moi-broni");
  revalidatePath("/account");
  revalidatePath("/book");
  revalidatePath(`/oplata/${bookingId}`);
  revalidatePath(`/oplata/${bookingId}/checkout`);
  if (booking.car) {
    revalidatePath(`/cars/${booking.car.slug}`);
  }
  revalidatePath("/admin-panel/bookings");
  revalidatePath("/");
  revalidatePath("/bronirovanie");

  return { ok: true };
}
