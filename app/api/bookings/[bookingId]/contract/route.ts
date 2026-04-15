import { auth } from "@/auth";
import { parseBookingContractMeta } from "@/lib/booking-contract";
import { extraServicePriceColumn } from "@/lib/extra-service-price-column";
import { buildRentalContractPdfBuffer } from "@/lib/rental-contract-pdf";
import { getAppBaseUrl } from "@/lib/app-url";
import { OFFICE_ADDRESS } from "@/lib/pickup-dropoff";
import { prisma } from "@/lib/prisma";
import { formatDateInputUTC, inclusiveRentalDays } from "@/lib/rental-dates";

/** Если в БД ещё нет строк прейскуранта (до миграции). */
const EXTRA_SERVICE_PDF_FALLBACK = [
  {
    name: "Подача или приемка ТС в указанном месте в черте городов Сухум, Гагра, Пицунда, Гудаута, Новый Афон",
    priceLabel: "500",
  },
  { name: "Детское кресло / люлька / бустер", priceLabel: "300 / сутки" },
  { name: "Дополнительный водитель", priceLabel: "500 / сутки" },
  { name: "Возврат ТС в позднее время (с 20 до 8)", priceLabel: "500" },
  { name: "Возврат ТС с неполным баком", priceLabel: "по стоимости топлива + 10%" },
] as const;

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

  const extraDb = await prisma.extraService.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const extraServiceRows =
    extraDb.length > 0
      ? extraDb.map((s) => ({
          name: s.name,
          priceLabel: extraServicePriceColumn(s),
        }))
      : [...EXTRA_SERVICE_PDF_FALLBACK];

  const buf = await buildRentalContractPdfBuffer({
    issuedAt: new Date(),
    bookingId: booking.id,
    startDate: booking.startDate,
    endDate: booking.endDate,
    days,
    pricePerDayRub: car.pricePerDayRub,
    totalPriceRub: booking.totalPriceRub,
    adminBookingsUrl,
    pickupLabel:
      booking.pickupMode === "ADDRESS"
        ? `по адресу: ${(booking.pickupAddress ?? "").trim() || OFFICE_ADDRESS}`
        : `офис: ${OFFICE_ADDRESS}`,
    dropoffLabel:
      booking.dropoffMode === "ADDRESS"
        ? `по адресу: ${(booking.dropoffAddress ?? "").trim() || OFFICE_ADDRESS}`
        : `офис: ${OFFICE_ADDRESS}`,
    pickupFeeRub: booking.pickupFeeRub ?? 0,
    dropoffFeeRub: booking.dropoffFeeRub ?? 0,
    car: {
      make: car.make,
      model: car.model,
      modelYear: car.modelYear,
      color: car.color.trim(),
      plateNumber: car.plateNumber.trim(),
      registrationCertificate: car.registrationCertificate.trim(),
    },
    meta,
    extraServiceRows,
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
