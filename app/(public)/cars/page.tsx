import Link from "next/link";

import { CarCatalogGrid } from "@/components/CarCatalogGrid";
import { getActiveCars } from "@/lib/cars";

export const dynamic = "force-dynamic";
/** Prisma требует Node.js runtime, не Edge. */
export const runtime = "nodejs";

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
        Выберите класс и бюджет — цена указана за одни сутки проката. Бронирование — после входа в аккаунт.
      </p>

      <CarCatalogGrid cars={cars} />
    </div>
  );
}
