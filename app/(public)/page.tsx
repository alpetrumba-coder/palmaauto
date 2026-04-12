import Link from "next/link";

import { CarCatalogGrid } from "@/components/CarCatalogGrid";
import { getActiveCars } from "@/lib/cars";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Главная: лендинг + каталог автомобилей из БД.
 */
export default async function HomePage() {
  const cars = await getActiveCars();

  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(3rem, 10vw, 5rem)" }}>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--color-text-secondary)",
          marginBottom: "var(--space-unit)",
        }}
      >
        Прокат автомобилей
      </p>
      <h1 style={{ fontSize: "var(--text-hero)", margin: "0 0 calc(var(--space-unit) * 2)" }}>
        ПальмаАвто
      </h1>
      <p
        style={{
          fontSize: "var(--text-xl)",
          color: "var(--color-text-secondary)",
          maxWidth: "40rem",
          lineHeight: "var(--leading-relaxed)",
          margin: 0,
        }}
      >
        Удобный выбор машины и бронирование на даты поездки: каталог с ценами за сутки ниже, подбор свободных авто по
        датам и бронь после входа в аккаунт.
      </p>

      <div style={{ marginTop: "calc(var(--space-unit) * 2)" }}>
        <Link
          href="/book"
          className="nav-tap-target"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.85rem 1.5rem",
            borderRadius: "999px",
            border: "1px solid var(--color-border)",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            textDecoration: "none",
            color: "var(--color-text)",
          }}
        >
          Подобрать по датам
        </Link>
      </div>

      <section style={{ marginTop: "calc(var(--space-unit) * 4)" }}>
        <h2 style={{ fontSize: "var(--text-3xl)", margin: "0 0 0.75rem" }}>Автомобили</h2>
        <p
          style={{
            fontSize: "var(--text-lg)",
            color: "var(--color-text-secondary)",
            maxWidth: "40rem",
            lineHeight: "var(--leading-relaxed)",
            margin: "0 0 calc(var(--space-unit) * 3)",
          }}
        >
          Выберите класс и бюджет — цена за сутки; подробнее на карточке машины.
        </p>
        <CarCatalogGrid cars={cars} />
      </section>
    </div>
  );
}
