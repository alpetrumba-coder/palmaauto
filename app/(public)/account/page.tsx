import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CancelBookingButton } from "@/components/CancelBookingButton";
import { formatPriceRub } from "@/lib/formatPrice";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Мои брони",
};

const statusLabel: Record<string, string> = {
  DRAFT: "Черновик",
  PENDING_PAYMENT: "Ожидает оплаты",
  PAID: "Оплачено",
  CANCELLED: "Отменено",
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account");
  }

  const bookings = await prisma.booking.findMany({
    where: { userId: session.user.id },
    orderBy: { startDate: "desc" },
    include: { car: true },
  });

  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3.5rem)" }}>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--color-text-secondary)",
          marginBottom: "var(--space-unit)",
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          Главная
        </Link>
        <span style={{ marginInline: "0.35rem" }}>/</span>
        <span style={{ color: "var(--color-text)" }}>Личный кабинет</span>
      </p>
      <h1 style={{ fontSize: "var(--text-3xl)", margin: "0 0 calc(var(--space-unit) * 2)" }}>Мои брони</h1>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "1.5rem" }}>
        {session.user.email}
      </p>

      {bookings.length === 0 ? (
        <div className="catalog-placeholder" role="status">
          Пока нет броней. Перейдите в{" "}
          <Link href="/cars" className="nav-tap-target">
            каталог
          </Link>
          .
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
          {bookings.map((b) => (
            <li
              key={b.id}
              style={{
                padding: "1rem 1.15rem",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                display: "flex",
                flexWrap: "wrap",
                gap: "1rem",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <div>
                <p style={{ margin: "0 0 0.35rem", fontWeight: 600 }}>
                  <Link href={`/cars/${b.car.slug}`}>{b.car.make} {b.car.model}</Link>
                </p>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                  {b.startDate.toLocaleDateString("ru-RU")} — {b.endDate.toLocaleDateString("ru-RU")} ·{" "}
                  {formatPriceRub(b.totalPriceRub)}
                </p>
                <p style={{ margin: "0.35rem 0 0", fontSize: "var(--text-sm)" }}>
                  {statusLabel[b.status] ?? b.status}
                </p>
              </div>
              {b.status === "PENDING_PAYMENT" ? <CancelBookingButton bookingId={b.id} /> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
