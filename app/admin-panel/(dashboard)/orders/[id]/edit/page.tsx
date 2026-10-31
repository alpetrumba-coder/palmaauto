import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderEditForm, orderGuestInitialFromBooking } from "@/components/admin/OrderEditForm";
import { bookingStatusToPaymentStatus } from "@/lib/admin-booking-payment";
import { formatBookingGuestLabel } from "@/lib/booking-display";
import { formatDateInputUTC } from "@/lib/rental-dates";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string }>;
};

function safeBackHref(back: string | undefined): string {
  if (back && back.startsWith("/admin-panel")) {
    return back;
  }
  return "/admin-panel/orders";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { user: true, car: true },
  });
  if (!booking) return { title: "Не найдено — админ" };
  const label = formatBookingGuestLabel(booking);
  return {
    title: `Заказ ${label} — админ`,
    robots: { index: false, follow: false },
  };
}

export default async function AdminOrderEditPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const cancelHref = safeBackHref(sp.back);

  const [booking, cars] = await Promise.all([
    prisma.booking.findUnique({
      where: { id },
      include: { user: true, car: true },
    }),
    prisma.car.findMany({
      orderBy: [{ make: "asc" }, { model: "asc" }],
      select: { id: true, make: true, model: true, active: true, pricePerDayRub: true },
    }),
  ]);

  if (!booking) {
    notFound();
  }

  if (booking.status === "CANCELLED") {
    return (
      <>
        <p style={{ margin: "0 0 1rem", fontSize: "var(--text-sm)" }}>
          <Link href={cancelHref} style={{ textDecoration: "none" }}>
            ← Назад
          </Link>
        </p>
        <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 0 }}>Заказ отменён</h1>
        <p style={{ color: "var(--color-text-secondary)" }}>Этот заказ уже удалён из календаря.</p>
      </>
    );
  }

  const carOptions = cars.map((c) => ({
    id: c.id,
    label: `${c.make} ${c.model}${c.active ? "" : " (скрыт)"}`,
    pricePerDayRub: c.pricePerDayRub,
  }));
  const guest = orderGuestInitialFromBooking(booking);
  const label = formatBookingGuestLabel(booking);

  return (
    <>
      <p style={{ margin: "0 0 1rem", fontSize: "var(--text-sm)" }}>
        <Link href="/admin-panel/orders" style={{ textDecoration: "none" }}>
          ← Заказы
        </Link>
        {" · "}
        <Link href={cancelHref} style={{ textDecoration: "none" }}>
          ← Шахматка
        </Link>
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 0 }}>Редактирование заказа</h1>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginBottom: "1.25rem" }}>
        {label} · {booking.car.make} {booking.car.model}
      </p>
      <OrderEditForm
        cancelHref={cancelHref}
        cars={carOptions}
        initial={{
          bookingId: booking.id,
          userId: booking.userId,
          status: booking.status,
          paymentStatus: bookingStatusToPaymentStatus(booking.status),
          totalPriceRub: booking.totalPriceRub,
          carId: booking.carId,
          startDate: formatDateInputUTC(booking.startDate),
          endDate: formatDateInputUTC(booking.endDate),
          paidAmountRub: booking.paidAmountRub,
          adminComment: booking.adminComment ?? "",
          isTest: booking.isTest,
          ...guest,
        }}
      />
    </>
  );
}
