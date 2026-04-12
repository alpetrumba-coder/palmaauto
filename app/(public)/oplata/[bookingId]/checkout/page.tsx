import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { formatPriceRub } from "@/lib/formatPrice";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Бронь оформлена — ПальмаАвто",
  description: "Оплата прошла успешно.",
};

function dateRangeLabelRu(start: Date, end: Date): string {
  const a = start.toLocaleDateString("ru-RU", { timeZone: "UTC" });
  const b = end.toLocaleDateString("ru-RU", { timeZone: "UTC" });
  return `${a} — ${b}`;
}

export default async function OplataCheckoutSuccessPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const session = await auth();
  const { bookingId } = await params;

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/oplata/${bookingId}/checkout`)}`);
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId: session.user.id, status: "PAID" },
    include: { car: true },
  });

  if (!booking) {
    notFound();
  }

  const title = `${booking.car.make} ${booking.car.model}`;

  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3.5rem)", maxWidth: "40rem" }}>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-unit)" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          Главная
        </Link>
        <span style={{ marginInline: "0.35rem" }}>/</span>
        <span style={{ color: "var(--color-text)" }}>Чекаут</span>
      </p>

      <h1 style={{ fontSize: "var(--text-hero)", margin: "0 0 1rem" }}>Оплата прошла успешно</h1>
      <p style={{ margin: "0 0 1.5rem", color: "var(--color-text-secondary)", fontSize: "var(--text-lg)" }}>
        Бронь оформлена. Детали ниже; позже здесь появится настоящая оплата картой.
      </p>

      <section
        style={{
          padding: "1.25rem",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          marginBottom: "1.5rem",
        }}
      >
        <p style={{ margin: "0 0 0.35rem", fontWeight: 600, fontSize: "var(--text-xl)" }}>{title}</p>
        <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          {dateRangeLabelRu(booking.startDate, booking.endDate)}
        </p>
        <p style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 600 }}>{formatPriceRub(booking.totalPriceRub)}</p>
      </section>

      <p style={{ margin: 0 }}>
        <Link href="/moi-broni" prefetch={false} className="nav-tap-target" style={{ fontWeight: 600, marginRight: "1rem" }}>
          Мои брони
        </Link>
        <Link href="/" style={{ color: "var(--color-text-secondary)" }}>
          На главную
        </Link>
      </p>
    </div>
  );
}
