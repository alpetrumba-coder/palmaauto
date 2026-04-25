import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const RETENTION_DAYS = 365 * 5;

function daysAgoUtc(days: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days));
}

async function main() {
  const cutoff = daysAgoUtc(RETENTION_DAYS);

  // Кандидаты: есть хотя бы одна бронь, последняя закончилась раньше cutoff, и ПДн ещё не стирали.
  // Ограничение по количеству — чтобы задача не упала на больших объёмах.
  const users = await prisma.user.findMany({
    where: {
      personalDataErasedAt: null,
      bookings: { some: {} },
    },
    select: { id: true },
    take: 500,
  });

  let erased = 0;

  for (const u of users) {
    const lastBooking = await prisma.booking.findFirst({
      where: { userId: u.id },
      orderBy: { endDate: "desc" },
      select: { endDate: true },
    });
    if (!lastBooking) continue;
    if (lastBooking.endDate >= cutoff) continue;

    await prisma.$transaction(async (tx) => {
      await tx.personalDataErasure.create({
        data: {
          userId: u.id,
          performedById: null,
          reason: "RETENTION_5Y",
          note: null,
        },
      });
      await tx.booking.updateMany({
        where: { userId: u.id },
        data: {
          contractMeta: Prisma.DbNull,
          secondDriverPassportData: null,
          pickupAddress: null,
          pickupTimeSlot: null,
          dropoffAddress: null,
          dropoffTimeSlot: null,
        },
      });
      await tx.user.update({
        where: { id: u.id },
        data: {
          personalDataErasedAt: new Date(),
          phone: null,
          address: null,
          passportData: null,
          passportSeries: null,
          passportNumber: null,
          passportIssuedBy: null,
          ageYears: null,
        },
      });
    });

    erased++;
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true, cutoff: cutoff.toISOString().slice(0, 10), checkedUsers: users.length, erased }, null, 2));
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

