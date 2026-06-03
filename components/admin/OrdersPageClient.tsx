"use client";

import Link from "next/link";

import { formatBookingUserLabel } from "@/lib/booking-display";
import { bookingStatusLabelRu } from "@/lib/admin-order-labels";
import type { BookingStatus } from "@prisma/client";

export type OrderListRow = {
  id: string;
  carLabel: string;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  totalPriceRub: number;
  paidAmountRub: number;
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    patronymic: string | null;
    phone: string | null;
  };
};

export function OrdersListTable({ orders }: { orders: OrderListRow[] }) {
  if (orders.length === 0) {
    return <p style={{ marginTop: "1.5rem", color: "var(--color-text-secondary)" }}>Активных заказов нет.</p>;
  }

  return (
    <div style={{ marginTop: "1.25rem", overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "var(--text-sm)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
        }}
      >
        <thead>
          <tr style={{ background: "var(--color-surface)", textAlign: "left" }}>
            <th style={{ padding: "0.65rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>Авто</th>
            <th style={{ padding: "0.65rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>Клиент</th>
            <th style={{ padding: "0.65rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>Период</th>
            <th style={{ padding: "0.65rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>Статус</th>
            <th style={{ padding: "0.65rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>Сумма</th>
            <th style={{ padding: "0.65rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>Предоплата</th>
            <th style={{ padding: "0.65rem 0.75rem", borderBottom: "1px solid var(--color-border)" }} />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>{o.carLabel}</td>
              <td style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>
                {formatBookingUserLabel(o.user)}
                {o.user.phone ? (
                  <span style={{ display: "block", color: "var(--color-text-secondary)", fontSize: "11px" }}>
                    {o.user.phone}
                  </span>
                ) : null}
              </td>
              <td style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>
                {o.startDate} — {o.endDate}
              </td>
              <td style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>
                {bookingStatusLabelRu[o.status] ?? o.status}
              </td>
              <td style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>
                {o.totalPriceRub.toLocaleString("ru-RU")} ₽
              </td>
              <td style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>
                {o.paidAmountRub.toLocaleString("ru-RU")} ₽
              </td>
              <td style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>
                <Link href={`/admin-panel/orders/${o.id}/edit`} style={{ fontWeight: 600 }}>
                  Редактировать
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
