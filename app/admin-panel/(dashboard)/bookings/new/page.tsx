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
  const [users, cars] = await Promise.all([
    prisma.user.findMany({
      orderBy: { email: "asc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        patronymic: true,
      },
    }),
    prisma.car.findMany({
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
    }),
  ]);

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
          ← Брони и заявки
        </Link>
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 0 }}>Новая бронь</h1>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginBottom: "1.25rem", maxWidth: "40rem" }}>
        Бронь привязывается к учётной записи клиента на сайте. Цена считается как число суток × тариф машины на момент
        создания.
      </p>
      <AdminBookingForm
        users={users}
        cars={cars}
        minDateStr={minDateStr}
        initialCarId={sp.carId}
        initialFrom={initialFrom}
        initialTo={initialTo}
      />
    </>
  );
}
