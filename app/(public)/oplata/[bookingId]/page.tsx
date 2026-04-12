import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { PaymentOplataClient } from "@/components/PaymentOplataClient";
import { isPendingPaymentHoldActive, pendingPaymentHoldExpiresAt } from "@/lib/booking-hold";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Оплата — ПальмаАвто",
  description: "Оплата брони автомобиля.",
};

function dateRangeLabelRu(start: Date, end: Date): string {
  const a = start.toLocaleDateString("ru-RU", { timeZone: "UTC" });
  const b = end.toLocaleDateString("ru-RU", { timeZone: "UTC" });
  return `${a} — ${b}`;
}

export default async function OplataPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const session = await auth();
  const { bookingId } = await params;

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/oplata/${bookingId}`)}`);
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { car: true },
  });

  if (!booking || booking.userId !== session.user.id) {
    notFound();
  }

  if (booking.status === "PAID") {
    redirect(`/oplata/${bookingId}/checkout`);
  }

  if (booking.status === "CANCELLED") {
    return (
      <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3.5rem)", maxWidth: "36rem" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 0 }}>Оплата</h1>
        <p style={{ color: "var(--color-text-secondary)" }}>Эта бронь отменена или срок оплаты истёк.</p>
        <p style={{ marginTop: "1rem" }}>
          <Link href="/" className="nav-tap-target" style={{ fontWeight: 600 }}>
            На главную
          </Link>
        </p>
      </div>
    );
  }

  if (booking.status !== "PENDING_PAYMENT") {
    return (
      <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3.5rem)", maxWidth: "36rem" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 0 }}>Оплата</h1>
        <p style={{ color: "var(--color-text-secondary)" }}>Бронь недоступна для оплаты.</p>
        <p style={{ marginTop: "1rem" }}>
          <Link href="/account">Личный кабинет</Link>
        </p>
      </div>
    );
  }

  if (!isPendingPaymentHoldActive(booking.createdAt)) {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });
    revalidatePath(`/oplata/${bookingId}`);
    revalidatePath("/account");
    revalidatePath("/admin-panel/bookings");
    if (booking.car) {
      revalidatePath(`/cars/${booking.car.slug}`);
    }
    revalidatePath("/");
    revalidatePath("/book");
    revalidatePath("/bronirovanie");

    return (
      <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3.5rem)", maxWidth: "36rem" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 0 }}>Оплата</h1>
        <p style={{ color: "var(--color-text-secondary)" }}>
          Время на оплату истекло (15 минут). Автомобиль снова доступен для бронирования.
        </p>
        <p style={{ marginTop: "1rem" }}>
          <Link href="/" className="nav-tap-target" style={{ fontWeight: 600 }}>
            На главную
          </Link>
        </p>
      </div>
    );
  }

  const carTitle = `${booking.car.make} ${booking.car.model}`;
  const deadlineMs = pendingPaymentHoldExpiresAt(booking.createdAt).getTime();

  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3.5rem)" }}>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-unit)" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          Главная
        </Link>
        <span style={{ marginInline: "0.35rem" }}>/</span>
        <span style={{ color: "var(--color-text)" }}>Оплата</span>
      </p>

      <h1 style={{ fontSize: "var(--text-hero)", margin: "0 0 1.5rem" }}>Оплата брони</h1>

      <PaymentOplataClient
        bookingId={bookingId}
        deadlineMs={deadlineMs}
        carTitle={carTitle}
        totalPriceRub={booking.totalPriceRub}
        dateRangeLabel={dateRangeLabelRu(booking.startDate, booking.endDate)}
      />
    </div>
  );
}
