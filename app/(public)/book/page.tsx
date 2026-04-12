import Link from "next/link";

import { CarCard } from "@/components/CarCard";
import { getAvailableCarsForRentalRange } from "@/lib/availability";
import { formatPriceRub } from "@/lib/formatPrice";
import { formatDateInputUTC, inclusiveRentalDays, parseDateInput, utcToday } from "@/lib/rental-dates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Подобрать авто по датам — ПальмаАвто",
  description: "Выберите даты проката и посмотрите свободные автомобили.",
};

export default async function BookByDatesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const fromStr = (sp.from ?? "").trim();
  const toStr = (sp.to ?? "").trim();
  const minStr = formatDateInputUTC(utcToday());

  let error: string | null = null;
  let cars: Awaited<ReturnType<typeof getAvailableCarsForRentalRange>> = [];

  const searched = Boolean(fromStr && toStr);

  if (searched) {
    const start = parseDateInput(fromStr);
    const end = parseDateInput(toStr);
    if (!start || !end) {
      error = "Укажите корректные даты.";
    } else if (end < start) {
      error = "Дата окончания не может быть раньше даты начала.";
    } else if (start < utcToday()) {
      error = "Нельзя искать период в прошлом.";
    } else {
      const days = inclusiveRentalDays(start, end);
      if (days > 90) {
        error = "Максимальный срок в подборе — 90 суток.";
      } else if (days < 1) {
        error = "Некорректный период.";
      } else {
        cars = await getAvailableCarsForRentalRange(start, end);
      }
    }
  }

  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3.5rem)" }}>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-unit)" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          Главная
        </Link>
        <span style={{ marginInline: "0.35rem" }}>/</span>
        <span style={{ color: "var(--color-text)" }}>Подбор по датам</span>
      </p>

      <h1 style={{ fontSize: "var(--text-hero)", margin: "0 0 0.75rem" }}>Подобрать автомобиль по датам</h1>
      <p style={{ margin: "0 0 1.5rem", color: "var(--color-text-secondary)", maxWidth: "40rem" }}>
        Укажите даты начала и окончания проката. Покажем только машины, свободные на весь выбранный период (без пересечений с
        оплаченными и ожидающими оплаты бронями).
      </p>

      <form
        method="GET"
        action="/book"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "flex-end",
          marginBottom: "2rem",
          padding: "1.25rem",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          maxWidth: "36rem",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
          Дата начала
          <input
            type="date"
            name="from"
            required
            min={minStr}
            defaultValue={fromStr}
            style={{
              padding: "0.5rem 0.65rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              fontSize: "var(--text-base)",
              background: "var(--color-bg)",
              color: "var(--color-text)",
            }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
          Дата окончания
          <input
            type="date"
            name="to"
            required
            min={fromStr || minStr}
            defaultValue={toStr}
            style={{
              padding: "0.5rem 0.65rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              fontSize: "var(--text-base)",
              background: "var(--color-bg)",
              color: "var(--color-text)",
            }}
          />
        </label>
        <button
          type="submit"
          className="nav-tap-target"
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: "999px",
            border: "none",
            background: "var(--color-accent)",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Показать доступные
        </button>
      </form>

      {error ? (
        <p role="alert" style={{ color: "var(--color-danger, #c00)", marginBottom: "1rem" }}>
          {error}
        </p>
      ) : null}

      {searched && !error ? (
        <>
          <p style={{ margin: "0 0 1rem", fontSize: "var(--text-lg)", fontWeight: 600 }}>
            Свободно на выбранные даты: {cars.length}{" "}
            {cars.length === 1 ? "автомобиль" : cars.length > 1 && cars.length < 5 ? "автомобиля" : "автомобилей"}
          </p>
          {cars.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)" }}>Попробуйте другие даты или загляните в общий каталог.</p>
          ) : (
            <ul
              className="cars-grid"
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
                gap: "1.25rem",
              }}
            >
              {cars.map((car) => {
                const cover = car.images[0];
                const q = `from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}`;
                return (
                  <li key={car.id}>
                    <CarCard
                      slug={car.slug}
                      make={car.make}
                      model={car.model}
                      pricePerDayRub={car.pricePerDayRub}
                      coverUrl={cover?.url ?? null}
                      coverAlt={cover?.alt ?? null}
                    />
                    <div style={{ marginTop: "0.65rem", textAlign: "center" }}>
                      <Link
                        href={`/cars/${encodeURIComponent(car.slug)}?${q}`}
                        className="nav-tap-target"
                        style={{
                          display: "inline-flex",
                          padding: "0.5rem 1rem",
                          borderRadius: "999px",
                          border: "1px solid var(--color-border)",
                          fontSize: "var(--text-sm)",
                          fontWeight: 600,
                          textDecoration: "none",
                          color: "var(--color-text)",
                        }}
                      >
                        Забронировать ({formatPriceRub(car.pricePerDayRub)}/сут.)
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
