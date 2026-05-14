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
export type CheckPaymentStatusResult =
  | { ok: true; paid: true }
  | { ok: true; paid: false; message: string }
  | { ok: false; error: string };

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

function amobileConfig(): { ok: true; phone: string; secret: string } | { ok: false; error: string } {
  const tspPhoneEnv = process.env.AMOBILE_TSP_PHONE ?? "";
  const tspSecret = process.env.AMOBILE_TSP_SECRET ?? "";
  if (!tspPhoneEnv.trim() || !tspSecret.trim()) {
    return { ok: false, error: "Сервер не настроен: задайте AMOBILE_TSP_PHONE и AMOBILE_TSP_SECRET." };
  }
  const phone = digits11Phone(tspPhoneEnv);
  if (phone.length !== 11) {
    return { ok: false, error: "Сервер не настроен: AMOBILE_TSP_PHONE должен содержать 11 цифр кошелька ТСП." };
  }
  return { ok: true, phone, secret: tspSecret };
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

  const cfg = amobileConfig();
  if (!cfg.ok) {
    return { ok: false, error: cfg.error };
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
  const md5 = md5Upper(`${order_id};${sum};${cfg.secret}`);

  const base = getAppBaseUrl();
  const success_url = `${base}/oplata/${booking.id}`;

  // Минимальный набор параметров (по инструкции обязательны: phone, order_id, sum, md5).
  // Остальные параметры добавим позже, когда базовый сценарий стабильно проходит у провайдера.
  const payload: Record<string, string> = {
    phone: cfg.phone,
    order_id,
    sum,
    md5,
    success_url,
  };

  let data: unknown;
  try {
    const bodyParams = new URLSearchParams();
    for (const [k, v] of Object.entries(payload)) {
      bodyParams.set(k, String(v));
    }
    const resp = await fetch("https://dengi.a-mobile.biz/api/v2/pay-link/create", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyParams.toString(),
      cache: "no-store",
    });
    data = await resp.json();
  } catch {
    return { ok: false, error: "Не удалось связаться с платёжным сервисом. Попробуйте позже." };
  }

  const obj = data as { status?: boolean; link?: string; error?: string; code?: number };
  if (!obj?.status || !obj.link) {
    const msg = (obj?.error ?? "").trim();
    const code = obj?.code;
    const suffix = code ? ` (код ${code})` : "";
    return { ok: false, error: msg ? `Платёжный сервис: ${msg}${suffix}` : `Платёжный сервис вернул ошибку.${suffix}` };
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

/**
 * Проверяет статус платежа в A‑Mobile, когда провайдер не отправляет callback.
 * Если платёж проведён, идемпотентно помечает бронь оплаченной.
 */
export async function checkAmobilePaymentStatusAction(bookingId: string): Promise<CheckPaymentStatusResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Войдите в аккаунт." };
  }

  const cfg = amobileConfig();
  if (!cfg.ok) {
    return { ok: false, error: cfg.error };
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId: session.user.id },
    include: { car: true },
  });
  if (!booking) {
    return { ok: false, error: "Бронь не найдена." };
  }

  if (booking.status === "PAID" || booking.status === "PARTIALLY_PAID") {
    return { ok: true, paid: true };
  }
  if (booking.status !== "PENDING_PAYMENT") {
    return { ok: false, error: "Эта бронь уже недоступна для подтверждения оплаты." };
  }

  const ts = Math.floor(Date.now() / 1000).toString();
  const md5 = md5Upper(`${cfg.phone};${ts};${cfg.secret}`);
  const bodyParams = new URLSearchParams({
    phone: cfg.phone,
    order_id: booking.id,
    ts,
    md5,
  });

  let data: unknown;
  try {
    const resp = await fetch("https://dengi.a-mobile.biz/api/v2/pay-link/status", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyParams.toString(),
      cache: "no-store",
    });
    data = await resp.json();
  } catch {
    return { ok: false, error: "Не удалось проверить платёж. Попробуйте ещё раз через минуту." };
  }

  const obj = data as { status?: boolean; error?: string; code?: number };
  if (!obj?.status) {
    const providerMessage = (obj?.error ?? "").trim();
    const msg = providerMessage || "Платёж пока не подтверждён.";
    return { ok: true, paid: false, message: msg };
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

  const nextPlan = booking.paymentPlan === "FIRST_DAY" ? "FIRST_DAY" : "FULL";
  const paidAmountRub = nextPlan === "FIRST_DAY" ? firstDayAmountRub : booking.totalPriceRub;
  const nextStatus = nextPlan === "FIRST_DAY" ? "PARTIALLY_PAID" : "PAID";

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: nextStatus,
      paymentPlan: nextPlan,
      paidAmountRub,
    },
  });

  revalidatePath("/moi-broni");
  revalidatePath("/account");
  revalidatePath("/book");
  revalidatePath(`/oplata/${booking.id}`);
  revalidatePath(`/oplata/${booking.id}/checkout`);
  if (booking.car) {
    revalidatePath(`/cars/${booking.car.slug}`);
  }
  revalidatePath("/admin-panel/bookings");
  revalidatePath("/");
  revalidatePath("/bronirovanie");

  return { ok: true, paid: true };
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
