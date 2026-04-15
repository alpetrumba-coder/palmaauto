import { auth } from "@/auth";
import { parseBookingContractMeta } from "@/lib/booking-contract";
import { buildRentalContractPdfBuffer } from "@/lib/rental-contract-pdf";
import { getAppBaseUrl } from "@/lib/app-url";
import { OFFICE_ADDRESS } from "@/lib/pickup-dropoff";
import { prisma } from "@/lib/prisma";
import { formatDateInputUTC, inclusiveRentalDays } from "@/lib/rental-dates";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const session = await auth();
  const { bookingId } = await params;

  if (!session?.user?.id) {
    return new Response("Требуется вход", { status: 401 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { car: true },
  });

  if (!booking || booking.userId !== session.user.id) {
    return new Response("Не найдено", { status: 404 });
  }

  const meta = parseBookingContractMeta(booking.contractMeta);
  if (!meta) {
    return new Response("Для этой брони нет данных договора", { status: 400 });
  }

  const car = booking.car;
  if (!car.modelYear || !car.color?.trim() || !car.plateNumber?.trim() || !car.registrationCertificate?.trim()) {
    return new Response("В карточке автомобиля не заполнены поля для договора", { status: 400 });
  }

  const days = inclusiveRentalDays(booking.startDate, booking.endDate);
  const base = getAppBaseUrl();
  const adminBookingsUrl = `${base}/admin-panel/bookings?from=${encodeURIComponent(formatDateInputUTC(booking.startDate))}`;

  void adminBookingsUrl;
  const baseRental = days * car.pricePerDayRub;
  const extrasTotalRub = Math.max(0, (booking.totalPriceRub ?? 0) - baseRental);

  const buf = await buildRentalContractPdfBuffer({
    issuedAt: new Date(),
    bookingId: booking.id,
    startDate: booking.startDate,
    endDate: booking.endDate,
    days,
    pricePerDayRub: car.pricePerDayRub,
    totalPriceRub: booking.totalPriceRub,
    extrasTotalRub,
    car: {
      make: car.make,
      model: car.model,
      modelYear: car.modelYear,
      color: car.color.trim(),
      plateNumber: car.plateNumber.trim(),
      registrationCertificate: car.registrationCertificate.trim(),
    },
    meta,
  });

  const filename = `dogovor-arendy-${booking.id.slice(0, 8)}.pdf`;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
