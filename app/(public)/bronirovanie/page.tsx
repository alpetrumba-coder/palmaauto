import type { Metadata } from "next";
import Link from "next/link";

import { auth } from "@/auth";
import { BookingCheckoutForm } from "@/components/BookingCheckoutForm";
import { CarPhotoImage } from "@/components/CarPhotoImage";
import { getBookingCheckoutPreview } from "@/lib/booking-checkout-preview";
import { formatPriceRub } from "@/lib/formatPrice";
import { prisma } from "@/lib/prisma";
import type { ContractFormInput } from "@/lib/booking-contract";
import { parseDateInput } from "@/lib/rental-dates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Бронирование — ПальмаАвто",
  description: "Оформление брони автомобиля: даты, контакты, оплата.",
};

function formatRuDate(isoYmd: string): string {
  const d = parseDateInput(isoYmd);
  if (!d) return isoYmd;
  return d.toLocaleDateString("ru-RU", { timeZone: "UTC" });
}

export default async function BronirovaniePage({
  searchParams,
}: {
  searchParams: Promise<{ car?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const carSlug = (sp.car ?? "").trim();
  const from = (sp.from ?? "").trim();
  const to = (sp.to ?? "").trim();

  const preview = await getBookingCheckoutPreview(carSlug, from, to);

  if (!preview.ok) {
    return (
      <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3.5rem)" }}>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-unit)" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            Главная
          </Link>
        </p>
        <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 1rem" }}>Бронирование</h1>
        <p role="alert" style={{ color: "var(--color-danger, #c00)", marginBottom: "1rem" }}>
          {preview.error}
        </p>
        <p style={{ margin: 0 }}>
          <Link href="/" className="nav-tap-target" style={{ fontWeight: 600 }}>
            Вернуться на главную
          </Link>
        </p>
      </div>
    );
  }

  const { car, days, totalPriceRub, fromStr, toStr } = preview;
  const title = `${car.make} ${car.model}`;
  const session = await auth();

  const profile =
    session?.user?.id != null
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            firstName: true,
            lastName: true,
            patronymic: true,
            phone: true,
            ageYears: true,
            passportSeries: true,
            passportNumber: true,
            passportIssuedBy: true,
          },
        })
      : null;

  const nameParts = [profile?.lastName, profile?.firstName, profile?.patronymic].filter(Boolean);
  const initialContract: Partial<ContractFormInput> = {
    fullName: nameParts.join(" ").trim(),
    ageYears: profile?.ageYears != null ? String(profile.ageYears) : "",
    passportSeries: profile?.passportSeries ?? "",
    passportNumber: profile?.passportNumber ?? "",
    passportIssuedBy: profile?.passportIssuedBy ?? "",
    additionalDriverName: "",
    additionalDriverPassport: "",
  };

  const callbackUrl = `/bronirovanie?car=${encodeURIComponent(car.slug)}&from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}`;

  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3.5rem)" }}>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-unit)" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          Главная
        </Link>
        <span style={{ marginInline: "0.35rem" }}>/</span>
        <span style={{ color: "var(--color-text)" }}>Бронирование</span>
      </p>

      <h1 style={{ fontSize: "var(--text-hero)", margin: "0 0 1.5rem" }}>Бронирование</h1>

      <section
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1.25rem",
          alignItems: "flex-start",
          marginBottom: "2rem",
          padding: "1.25rem",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          maxWidth: "42rem",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "min(200px, 100%)",
            aspectRatio: "16 / 10",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            background: "var(--color-border)",
            flexShrink: 0,
          }}
        >
          {car.coverUrl ? (
            <CarPhotoImage src={car.coverUrl} alt={car.coverAlt ?? title} priority />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-secondary)",
              }}
            >
              Фото скоро
            </div>
          )}
        </div>
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <p style={{ margin: "0 0 0.35rem", fontSize: "var(--text-xl)", fontWeight: 600 }}>{title}</p>
          <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
            {formatRuDate(fromStr)} — {formatRuDate(toStr)} · {days} дн.
          </p>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
            {formatPriceRub(car.pricePerDayRub)} × {days} ={" "}
            <strong style={{ fontSize: "var(--text-lg)", color: "var(--color-text)" }}>{formatPriceRub(totalPriceRub)}</strong>
          </p>
        </div>
      </section>

      {!session?.user?.id ? (
        <div
          style={{
            padding: "1.25rem",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            maxWidth: "28rem",
          }}
        >
          <p style={{ margin: "0 0 0.75rem", fontWeight: 600 }}>Вход в аккаунт</p>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
            Чтобы заполнить данные и перейти к оплате,{" "}
            <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} style={{ fontWeight: 600 }}>
              войдите
            </Link>
            {" или "}
            <Link href="/register" style={{ fontWeight: 600 }}>
              зарегистрируйтесь
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 1rem", fontWeight: 600 }}>Ваши данные</h2>
          <BookingCheckoutForm
            carId={car.id}
            startDate={fromStr}
            endDate={toStr}
            initialPhone={profile?.phone ?? ""}
            initialContract={initialContract}
          />
        </>
      )}
    </div>
  );
}
