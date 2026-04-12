import Link from "next/link";

import { CarCard } from "@/components/CarCard";
import { CarPhotoImage } from "@/components/CarPhotoImage";
import { bookByDatesMinDateStr, getBookByDatesState } from "@/lib/book-by-dates-state";
import { formatPriceRub } from "@/lib/formatPrice";

const inputStyle = {
  padding: "0.5rem 0.65rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  fontSize: "var(--text-base)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
} as const;

type BookByDatesSectionProps = {
  action: string;
  fromStr?: string;
  toStr?: string;
  /** Сетка карточек (страница `/book`) или список строк (главная). */
  resultsLayout: "grid" | "list";
};

export async function BookByDatesSection({
  action,
  fromStr = "",
  toStr = "",
  resultsLayout,
}: BookByDatesSectionProps) {
  const state = await getBookByDatesState(fromStr, toStr);
  const minStr = bookByDatesMinDateStr();
  const { fromStr: f, toStr: t, searched, error, cars } = state;

  const formShellStyle =
    resultsLayout === "list"
      ? {
          display: "flex" as const,
          flexWrap: "wrap" as const,
          gap: "0.75rem",
          alignItems: "flex-end" as const,
          marginBottom: "1.5rem",
          padding: "1.25rem",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          maxWidth: "42rem",
        }
      : {
          display: "flex" as const,
          flexWrap: "wrap" as const,
          gap: "0.75rem",
          alignItems: "flex-end" as const,
          marginBottom: "2rem",
          padding: "1.25rem",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          maxWidth: "36rem",
        };

  return (
    <>
      <form method="GET" action={action} style={formShellStyle}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
          Дата начала
          <input type="date" name="from" required min={minStr} defaultValue={f} style={inputStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
          Дата окончания
          <input type="date" name="to" required min={f || minStr} defaultValue={t} style={inputStyle} />
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
            <p style={{ color: "var(--color-text-secondary)" }}>
              Попробуйте другие даты или загляните в{" "}
              <Link href="/cars" style={{ color: "var(--color-accent)" }}>
                общий каталог
              </Link>
              .
            </p>
          ) : resultsLayout === "grid" ? (
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
                const q = `from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`;
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
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 0,
                maxWidth: "42rem",
              }}
            >
              {cars.map((car) => {
                const cover = car.images[0];
                const title = `${car.make} ${car.model}`;
                const q = `from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`;
                return (
                  <li
                    key={car.id}
                    style={{
                      display: "flex",
                      gap: "1rem",
                      alignItems: "stretch",
                      paddingBlock: "1rem",
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    <Link
                      href={`/cars/${encodeURIComponent(car.slug)}?${q}`}
                      className="nav-tap-target"
                      style={{
                        position: "relative",
                        width: "min(140px, 32vw)",
                        flexShrink: 0,
                        aspectRatio: "16 / 10",
                        borderRadius: "var(--radius-md)",
                        overflow: "hidden",
                        background: "var(--color-border)",
                        alignSelf: "center",
                      }}
                    >
                      {cover?.url ? (
                        <CarPhotoImage src={cover.url} alt={cover.alt ?? title} priority={false} />
                      ) : (
                        <span
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
                        </span>
                      )}
                    </Link>
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.35rem",
                        justifyContent: "center",
                      }}
                    >
                      <Link
                        href={`/cars/${encodeURIComponent(car.slug)}?${q}`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <span style={{ fontSize: "var(--text-xl)", fontWeight: 600, letterSpacing: "-0.02em" }}>
                          {title}
                        </span>
                      </Link>
                      <p style={{ margin: 0, fontSize: "var(--text-base)", color: "var(--color-text-secondary)" }}>
                        {formatPriceRub(car.pricePerDayRub)} за сутки
                      </p>
                      <div style={{ marginTop: "0.25rem" }}>
                        <Link
                          href={`/cars/${encodeURIComponent(car.slug)}?${q}`}
                          className="nav-tap-target"
                          style={{
                            display: "inline-flex",
                            padding: "0.45rem 0.95rem",
                            borderRadius: "999px",
                            border: "1px solid var(--color-border)",
                            fontSize: "var(--text-sm)",
                            fontWeight: 600,
                            textDecoration: "none",
                            color: "var(--color-text)",
                          }}
                        >
                          Забронировать
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : null}
    </>
  );
}
