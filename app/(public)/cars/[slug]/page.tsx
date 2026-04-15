import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { CarBookingForm } from "@/components/CarBookingForm";
import { CarPhotoImage } from "@/components/CarPhotoImage";
import { getActiveCarBySlug } from "@/lib/cars";
import { formatPriceRub } from "@/lib/formatPrice";
import { prisma } from "@/lib/prisma";
import type { ContractFormInput } from "@/lib/booking-contract";
import { formatDateInputUTC, parseDateInput, utcToday } from "@/lib/rental-dates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const car = await getActiveCarBySlug(slug);
  if (!car) {
    return { title: "Не найдено — ПальмаАвто" };
  }
  return {
    title: `${car.make} ${car.model} — ПальмаАвто`,
    description: car.description.slice(0, 160),
  };
}

/**
 * Карточка одного автомобиля (`/cars/[slug]`).
 */
export default async function CarDetailPage({ params, searchParams }: PageProps) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const car = await getActiveCarBySlug(slug);
  if (!car) {
    notFound();
  }

  const title = `${car.make} ${car.model}`;
  const minDateStr = formatDateInputUTC(utcToday());
  const pf = sp.from?.trim();
  const pt = sp.to?.trim();
  const ds = pf ? parseDateInput(pf) : null;
  const de = pt ? parseDateInput(pt) : null;
  let initialFrom: string | undefined;
  let initialEnd: string | undefined;
  if (ds && de && ds >= utcToday() && de >= ds) {
    initialFrom = pf;
    initialEnd = pt;
  }

  const session = await auth();
  let contractDefaults: Partial<ContractFormInput> | undefined;
  if (session?.user?.id) {
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        lastName: true,
        firstName: true,
        patronymic: true,
        ageYears: true,
        passportSeries: true,
        passportNumber: true,
        passportIssuedBy: true,
      },
    });
    if (u) {
      const parts = [u.lastName, u.firstName, u.patronymic].filter(Boolean);
      const fullName = parts.join(" ").trim();
      contractDefaults = {
        fullName,
        ageYears: u.ageYears != null ? String(u.ageYears) : "",
        passportSeries: u.passportSeries ?? "",
        passportNumber: u.passportNumber ?? "",
        passportIssuedBy: u.passportIssuedBy ?? "",
      };
    }
  }

  const carLeaseComplete = Boolean(
    car.modelYear &&
      car.color?.trim() &&
      car.plateNumber?.trim() &&
      car.registrationCertificate?.trim(),
  );

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
        <Link href="/cars" style={{ textDecoration: "none" }}>
          Каталог
        </Link>
        <span style={{ marginInline: "0.35rem" }}>/</span>
        <span style={{ color: "var(--color-text)" }}>{title}</span>
      </p>

      <div className="car-detail-layout">
        <div>
          <h1 style={{ fontSize: "var(--text-hero)", margin: "0 0 calc(var(--space-unit) * 2)" }}>{title}</h1>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>за сутки</p>
          <p style={{ margin: "0.25rem 0 calc(var(--space-unit) * 3)", fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 600 }}>
            {formatPriceRub(car.pricePerDayRub)}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-lg)",
              lineHeight: "var(--leading-relaxed)",
              color: "var(--color-text-secondary)",
              maxWidth: "42rem",
              whiteSpace: "pre-wrap",
            }}
          >
            {car.description}
          </p>
          <CarBookingForm
            carId={car.id}
            slug={car.slug}
            pricePerDayRub={car.pricePerDayRub}
            minDateStr={minDateStr}
            initialStartDate={initialFrom}
            initialEndDate={initialEnd}
            carLeaseComplete={carLeaseComplete}
            minRentalDays={car.minRentalDays}
            contractDefaults={contractDefaults}
          />
        </div>

        {car.images.length > 0 ? (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gap: "1rem",
            }}
          >
            {car.images.map((img, index) => (
              <li
                key={img.id}
                style={{
                  position: "relative",
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                  border: "1px solid var(--color-border)",
                  boxShadow: "var(--shadow-soft)",
                  aspectRatio: "16 / 10",
                  maxHeight: "min(70vh, 520px)",
                }}
              >
                <CarPhotoImage src={img.url} alt={img.alt ?? title} priority={index === 0} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="catalog-placeholder" role="status">
            Фотографии появятся позже.
          </div>
        )}
      </div>
    </div>
  );
}
