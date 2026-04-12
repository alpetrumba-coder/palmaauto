"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { isPendingPaymentHoldActive } from "@/lib/booking-hold";
import { prisma } from "@/lib/prisma";

export type FakePaymentResult = { ok: true } | { ok: false; error: string };

/** Имитация успешной оплаты (позже — реальный платёжный провайдер). */
export async function completeFakePaymentAction(bookingId: string): Promise<FakePaymentResult> {
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

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "PAID" },
  });

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
