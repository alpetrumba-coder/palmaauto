"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { cancelAdminOrderAction } from "@/app/actions/admin-orders";
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

export function OrdersListTable({ orders: initialOrders }: { orders: OrderListRow[] }) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  async function onDelete(orderId: string) {
    if (
      !window.confirm(
        "Удалить заказ? Бронь будет отменена и исчезнет из календаря. Это действие необратимо.",
      )
    ) {
      return;
    }
    setError(null);
    setDeletingId(orderId);
    const res = await cancelAdminOrderAction(orderId);
    setDeletingId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    router.refresh();
  }

  if (orders.length === 0) {
    return (
      <>
        {error ? (
          <p role="alert" style={{ marginTop: "1rem", fontSize: "var(--text-sm)", color: "var(--color-danger, #b00020)" }}>
            {error}
          </p>
        ) : null}
        <p style={{ marginTop: "1.5rem", color: "var(--color-text-secondary)" }}>Активных заказов нет.</p>
      </>
    );
  }

  return (
    <>
      {error ? (
        <p role="alert" style={{ marginTop: "1rem", fontSize: "var(--text-sm)", color: "var(--color-danger, #b00020)" }}>
          {error}
        </p>
      ) : null}
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
            {orders.map((o) => {
              const busy = deletingId === o.id;
              return (
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
                    <span style={{ display: "inline-flex", gap: "0.65rem", alignItems: "center", flexWrap: "wrap" }}>
                      <Link href={`/admin-panel/orders/${o.id}/edit`} style={{ fontWeight: 600 }}>
                        Редактировать
                      </Link>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onDelete(o.id)}
                        style={{
                          border: "none",
                          background: "transparent",
                          padding: 0,
                          font: "inherit",
                          fontWeight: 600,
                          color: "var(--color-danger, #b00020)",
                          cursor: busy ? "wait" : "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        {busy ? "Удаление…" : "Удалить"}
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
