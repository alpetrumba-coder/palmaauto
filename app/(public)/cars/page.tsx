import Link from "next/link";

import { CarCard } from "@/components/CarCard";
import { getActiveCars } from "@/lib/cars";

export const dynamic = "force-dynamic";

/**
 * Публичный каталог автомобилей (`/cars`). Только активные машины из БД.
 */
export default async function CarsCatalogPage() {
  const cars = await getActiveCars();

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
        <span style={{ marginInline: "0.35rem", color: "var(--color-text-secondary)" }}>/</span>
        Каталог
      </p>
      <h1 style={{ fontSize: "var(--text-3xl)", margin: "0 0 calc(var(--space-unit) * 2)" }}>Автомобили</h1>
      <p
        style={{
          fontSize: "var(--text-lg)",
          color: "var(--color-text-secondary)",
          maxWidth: "40rem",
          lineHeight: "var(--leading-relaxed)",
          margin: "0 0 calc(var(--space-unit) * 4)",
        }}
      >
        Выберите класс и бюджет — цена указана за одни сутки проката. Позже здесь появится бронирование по датам.
      </p>

      {cars.length === 0 ? (
        <div className="catalog-placeholder" role="status">
          В каталоге пока нет доступных автомобилей. Загляните позже или свяжитесь с нами.
        </div>
      ) : (
        <ul
          className="car-grid"
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
            gap: "clamp(1rem, 3vw, 1.5rem)",
          }}
        >
          {cars.map((car) => {
            const cover = car.images[0];
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
