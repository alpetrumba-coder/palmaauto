import { bookingsOverlappingRangeWhere } from "@/lib/booking-overlap";
import { prisma } from "@/lib/prisma";

/** Активные машины без пересечения с подтверждёнными/ожидающими бронями на [start, end]. */
export async function getAvailableCarsForRentalRange(start: Date, end: Date) {
  const conflicting = await prisma.booking.findMany({
    where: bookingsOverlappingRangeWhere(start, end),
    select: { carId: true },
  });
  const busyIds = [...new Set(conflicting.map((b) => b.carId))];

  return prisma.car.findMany({
    where: {
      active: true,
      ...(busyIds.length > 0 ? { id: { notIn: busyIds } } : {}),
    },
    orderBy: [{ make: "asc" }, { model: "asc" }],
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });
}
