import type { Metadata } from "next";
import Link from "next/link";

import { OrdersListTable, type OrderListRow } from "@/components/admin/OrdersPageClient";
import { bookingHoldsCarWhere } from "@/lib/booking-overlap";
import { formatDateInputUTC } from "@/lib/rental-dates";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Заказы — админ",
  robots: { index: false, follow: false },
};

export default async function AdminOrdersPage() {
  const bookingsRaw = await prisma.booking.findMany({
    where: bookingHoldsCarWhere(),
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
      car: { select: { make: true, model: true } },
    },
    orderBy: [{ startDate: "desc" }],
  });

  const orders: OrderListRow[] = bookingsRaw.map((b) => ({
    id: b.id,
    carLabel: `${b.car.make} ${b.car.model}`,
    startDate: formatDateInputUTC(b.startDate),
    endDate: formatDateInputUTC(b.endDate),
    status: b.status,
    totalPriceRub: b.totalPriceRub,
    paidAmountRub: b.paidAmountRub,
    user: b.user,
  }));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", margin: 0 }}>Заказы</h1>
        <Link
          href="/admin-panel/bookings/new"
          className="nav-tap-target"
          style={{
            display: "inline-flex",
            padding: "0.6rem 1.1rem",
            borderRadius: "999px",
            background: "var(--color-accent)",
            color: "#fff",
            fontWeight: 600,
            textDecoration: "none",
            fontSize: "var(--text-sm)",
          }}
        >
          Новая бронь
        </Link>
      </div>

      <p style={{ marginTop: "0.75rem", color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", maxWidth: "44rem" }}>
        Активные брони. Редактирование дат, автомобиля, предоплаты и данных клиента. Откройте бронь в{" "}
        <Link href="/admin-panel/bookings" style={{ fontWeight: 600 }}>
          календаре
        </Link>
        .
      </p>

      <OrdersListTable orders={orders} />
    </>
  );
}
