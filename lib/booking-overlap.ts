import type { Prisma } from "@prisma/client";

import { PENDING_PAYMENT_HOLD_MS } from "@/lib/booking-hold";

/**
 * Бронь считается занимающей машину в календаре, если:
 * - оплачена (PAID), или
 * - ожидает оплату и создана не раньше чем (сейчас − 15 мин) — удержание слота.
 */
export function bookingHoldsCarWhere(referenceTime: Date = new Date()): Prisma.BookingWhereInput {
  const holdSince = new Date(referenceTime.getTime() - PENDING_PAYMENT_HOLD_MS);
  return {
    OR: [{ status: "PAID" }, { status: "PENDING_PAYMENT", createdAt: { gte: holdSince } }],
  };
}

/** Пересечение с интервалом [rangeStart, rangeEnd] (включительно, UTC-даты). */
export function bookingsOverlappingRangeWhere(rangeStart: Date, rangeEnd: Date): Prisma.BookingWhereInput {
  return {
    AND: [
      bookingHoldsCarWhere(),
      { startDate: { lte: rangeEnd } },
      { endDate: { gte: rangeStart } },
    ],
  };
}

/** Пересечение для одной машины и диапазона дат. */
export function carBookingOverlapWhere(carId: string, rangeStart: Date, rangeEnd: Date): Prisma.BookingWhereInput {
  return {
    carId,
    AND: [
      bookingHoldsCarWhere(),
      { startDate: { lte: rangeEnd } },
      { endDate: { gte: rangeStart } },
    ],
  };
}
