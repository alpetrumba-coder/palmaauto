"use server";

import { revalidatePath } from "next/cache";
import crypto from "node:crypto";

import { auth } from "@/auth";
import { isPendingPaymentHoldActive } from "@/lib/booking-hold";
import { getAppBaseUrl } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";
import { inclusiveRentalDays } from "@/lib/rental-dates";

export type FakePaymentPlan = "FULL" | "FIRST_DAY";
export type FakePaymentResult = { ok: true } | { ok: false; error: string };

export type AmobilePaymentPlan = FakePaymentPlan;
export type CreatePayLinkResult = { ok: true; link: string } | { ok: false; error: string };

function digits11Phone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 11) return d;
  // иногда телефон/кошелёк может прилететь с ведущей 7/8 — не пытаемся гадать, пусть настройка будет корректной
  return d;
}

function formatRubSum(rub: number): string {
  const safe = Number.isFinite(rub) ? Math.max(0, Math.round(rub)) : 0;
  return `${safe.toFixed(2)}`; // "123.00"
}

function md5Upper(s: string): string {
  return crypto.createHash("md5").update(s, "utf8").digest("hex").toUpperCase();
}

/**
 * Создаёт платёжную ссылку A‑Mobile/Moneta и возвращает URL редиректа.
 * Оплата подтверждается отдельным уведомлением (webhook) от A‑Mobile.
 */
export async function createAmobilePayLinkAction(bookingId: string, plan: AmobilePaymentPlan): Promise<CreatePayLinkResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Войдите в аккаунт." };
  }

  const tspPhoneEnv = process.env.AMOBILE_TSP_PHONE ?? "";
  const tspSecret = process.env.AMOBILE_TSP_SECRET ?? "";
  if (!tspPhoneEnv.trim() || !tspSecret.trim()) {
    return { ok: false, error: "Сервер не настроен: задайте AMOBILE_TSP_PHONE и AMOBILE_TSP_SECRET." };
  }
  const phone = digits11Phone(tspPhoneEnv);
  if (phone.length !== 11) {
    return { ok: false, error: "Сервер не настроен: AMOBILE_TSP_PHONE должен содержать 11 цифр кошелька ТСП." };
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

  const normalizedPlan: AmobilePaymentPlan = plan === "FIRST_DAY" ? "FIRST_DAY" : "FULL";
  const amountRub = normalizedPlan === "FIRST_DAY" ? firstDayAmountRub : booking.totalPriceRub;
  const sum = formatRubSum(amountRub);

  const order_id = booking.id; // по решению: booking.id = order_id
  const md5 = md5Upper(`${order_id};${sum};${tspSecret}`);

  const base = getAppBaseUrl();
  const success_url = `${base}/oplata/${booking.id}/checkout`;

  // comment вернётся обратно в webhook — используем для определения плана
  const comment = `PALMAAUTO;booking=${booking.id};plan=${normalizedPlan}`;

  const lifetimeMinutes = 15; // как в текущей логике удержания
  const email = (process.env.AMOBILE_NOTIFY_EMAIL ?? "").trim();
  const sms_phone_number = digits11Phone(process.env.AMOBILE_NOTIFY_SMS_PHONE ?? "");

  const payload: Record<string, string | number> = {
    phone,
    order_id,
    sum,
    md5,
    lifetime: lifetimeMinutes,
    success_url,
    comment,
    user_id: session.user.id,
  };
  if (email) payload.email = email;
  if (sms_phone_number.length === 11) payload.sms_phone_number = sms_phone_number;

  let data: unknown;
  try {
    const resp = await fetch("https://dengi.a-mobile.biz/api/v2/pay-link/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    data = await resp.json();
  } catch {
    return { ok: false, error: "Не удалось связаться с платёжным сервисом. Попробуйте позже." };
  }

  const obj = data as { status?: boolean; link?: string; error?: string; code?: number };
  if (!obj?.status || !obj.link) {
    const msg = (obj?.error ?? "").trim();
    return { ok: false, error: msg ? `Платёжный сервис: ${msg}` : "Платёжный сервис вернул ошибку." };
  }

  // сохраняем выбранный план (чтобы UI/админка соответствовали ожиданию пользователя)
  await prisma.booking.update({
    where: { id: booking.id },
    data: { paymentPlan: normalizedPlan === "FIRST_DAY" ? "FIRST_DAY" : "FULL" },
  });

  revalidatePath(`/oplata/${bookingId}`);
  revalidatePath("/moi-broni");

  return { ok: true, link: obj.link };
}

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
