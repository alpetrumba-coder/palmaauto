import type { Metadata } from "next";

import { BookingChessboard } from "@/components/admin/BookingChessboard";
import { bookingsOverlappingRangeWhere } from "@/lib/booking-overlap";
import { prisma } from "@/lib/prisma";
import { addUtcDays, buildUtcDayRange, formatDateInputUTC, parseDateInput, utcStartOfMonth, utcToday } from "@/lib/rental-dates";

export const metadata: Metadata = {
  title: "Брони — админ",
  robots: { index: false, follow: false },
};

const NUM_DAYS = 42;

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const sp = await searchParams;
  const parsed = sp.from ? parseDateInput(sp.from) : null;
  const today = utcToday();
  const defaultStart = utcStartOfMonth(today);
  const viewStart =
    parsed && parsed.getTime() >= addUtcDays(today, -365).getTime() && parsed.getTime() <= addUtcDays(today, 800).getTime()
      ? parsed
      : defaultStart;
  const viewEnd = addUtcDays(viewStart, NUM_DAYS - 1);
  const days = buildUtcDayRange(viewStart, NUM_DAYS);

  const prevFromStr = formatDateInputUTC(addUtcDays(viewStart, -NUM_DAYS));
  const nextFromStr = formatDateInputUTC(addUtcDays(viewStart, NUM_DAYS));

  const [cars, bookingsRaw] = await Promise.all([
    prisma.car.findMany({
      orderBy: [{ make: "asc" }, { model: "asc" }],
      select: {
        id: true,
        make: true,
        model: true,
        slug: true,
        active: true,
        pricePerDayRub: true,
      },
    }),
    prisma.booking.findMany({
      where: bookingsOverlappingRangeWhere(viewStart, viewEnd),
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            patronymic: true,
            phone: true,
          },
        },
      },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const bookings = bookingsRaw.map((b) => ({
    id: b.id,
    carId: b.carId,
    userId: b.userId,
    startDate: b.startDate,
    endDate: b.endDate,
    status: b.status,
    user: b.user,
  }));

  return (
    <BookingChessboard
      days={days}
      viewStart={viewStart}
      viewEnd={viewEnd}
      prevFromStr={prevFromStr}
      nextFromStr={nextFromStr}
      cars={cars}
      bookings={bookings}
    />
  );
}
