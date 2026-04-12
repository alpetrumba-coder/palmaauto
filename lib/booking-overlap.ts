import type { BookingStatus, Prisma } from "@prisma/client";

/** Брони в этих статусах занимают машину в календаре. */
export const BLOCKING_BOOKING_STATUSES: BookingStatus[] = ["PENDING_PAYMENT", "PAID"];

/** Prisma-фильтр: бронь пересекается с интервалом [rangeStart, rangeEnd] (включительно, UTC-даты). */
export function bookingsOverlappingRangeWhere(
  rangeStart: Date,
  rangeEnd: Date,
): Prisma.BookingWhereInput {
  return {
    status: { in: BLOCKING_BOOKING_STATUSES },
    AND: [{ startDate: { lte: rangeEnd } }, { endDate: { gte: rangeStart } }],
  };
}
