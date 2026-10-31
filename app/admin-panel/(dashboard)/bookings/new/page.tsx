import type { Metadata } from "next";
import Link from "next/link";

import { AdminBookingForm } from "@/components/admin/AdminBookingForm";
import { prisma } from "@/lib/prisma";
import { formatDateInputUTC, parseDateInput, utcToday } from "@/lib/rental-dates";

export const metadata: Metadata = {
  title: "Новая бронь — админ",
  robots: { index: false, follow: false },
};

export default async function AdminNewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ carId?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const cars = await prisma.car.findMany({
    orderBy: [{ make: "asc" }, { model: "asc" }],
    select: {
      id: true,
      make: true,
      model: true,
      slug: true,
      active: true,
      pricePerDayRub: true,
      minRentalDays: true,
    },
  });

  const minDateStr = formatDateInputUTC(utcToday());
  const fromOk = sp.from?.trim() && parseDateInput(sp.from.trim());
  const toOk = sp.to?.trim() && parseDateInput(sp.to.trim());
  let initialFrom: string | undefined;
  let initialTo: string | undefined;
  if (fromOk && toOk && fromOk >= utcToday() && toOk >= fromOk) {
    initialFrom = sp.from!.trim();
    initialTo = sp.to!.trim();
  }

  return (
    <>
      <p style={{ margin: "0 0 1rem", fontSize: "var(--text-sm)" }}>
        <Link href="/admin-panel/bookings" style={{ textDecoration: "none" }}>
          ← Шахматка
        </Link>
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 0 }}>Новая бронь</h1>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginBottom: "1.25rem", maxWidth: "40rem" }}>
        Данные туриста вносятся прямо в заказ — отдельную карточку пользователя заводить не нужно. Почта не
        требуется. Сумму и предоплату укажите вручную.
      </p>
      <AdminBookingForm
        cars={cars}
        minDateStr={minDateStr}
        initialCarId={sp.carId}
        initialFrom={initialFrom}
        initialTo={initialTo}
      />
    </>
  );
}
