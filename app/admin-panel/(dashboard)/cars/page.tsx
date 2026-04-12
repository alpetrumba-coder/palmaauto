import type { Metadata } from "next";
import Link from "next/link";

import { DeleteCarButton } from "@/components/admin/DeleteCarButton";
import { formatPriceRub } from "@/lib/formatPrice";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Автомобили — админ",
  robots: { index: false, follow: false },
};

export default async function AdminCarsListPage() {
  const cars = await prisma.car.findMany({
    orderBy: [{ make: "asc" }, { model: "asc" }],
    include: {
      _count: { select: { images: true } },
    },
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", margin: 0 }}>Автомобили в прокате</h1>
        <Link
          href="/admin-panel/cars/new"
          className="nav-tap-target"
          style={{
            display: "inline-flex",
            padding: "0.6rem 1.1rem",
            borderRadius: "999px",
            background: "var(--color-accent)",
            color: "#fff",
            fontWeight: 600,
            textDecoration: "none",
            fontSize: "var(--text-sm)",
          }}
        >
          Добавить
        </Link>
      </div>

      {cars.length === 0 ? (
        <p style={{ marginTop: "1.5rem", color: "var(--color-text-secondary)" }}>Пока нет записей. Создайте первую.</p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: "1.5rem 0 0",
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
          }}
        >
          {cars.map((car) => (
            <li
              key={car.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
              }}
            >
              <div>
                <span style={{ fontWeight: 600 }}>
                  {car.make} {car.model}
                </span>
                <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginLeft: "0.5rem" }}>
                  {formatPriceRub(car.pricePerDayRub)}/сут. · {car._count.images} фото
                </span>
                {!car.active ? (
                  <span
                    style={{
                      marginLeft: "0.5rem",
                      fontSize: "var(--text-xs)",
                      padding: "0.15rem 0.45rem",
                      borderRadius: "4px",
                      background: "var(--color-border)",
                    }}
                  >
                    скрыт
                  </span>
                ) : null}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Link
                  href={`/cars/${car.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "var(--text-sm)" }}
                >
                  На сайте
                </Link>
                <Link href={`/admin-panel/cars/${car.id}/edit`} style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
                  Редактировать
                </Link>
                <DeleteCarButton carId={car.id} slug={`${car.make} ${car.model}`} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
