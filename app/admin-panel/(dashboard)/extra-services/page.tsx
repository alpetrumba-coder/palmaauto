import type { Metadata } from "next";
import Link from "next/link";

import { DeleteExtraServiceButton } from "@/components/admin/DeleteExtraServiceButton";
import { extraServicePriceColumn } from "@/lib/extra-service-price-column";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Дополнительные услуги — админ",
  robots: { index: false, follow: false },
};

export default async function AdminExtraServicesPage() {
  const services = await prisma.extraService.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", margin: 0 }}>Дополнительные услуги</h1>
        <Link
          href="/admin-panel/extra-services/new"
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
          Добавить услугу
        </Link>
      </div>
      <p style={{ marginTop: "0.75rem", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", maxWidth: "42rem" }}>
        Список попадает в PDF договора (Приложение №3). Цена за сутки &gt; 0 отображается как «N / сутки»; при 0 — текст из поля «фиксированная цена».
      </p>

      {services.length === 0 ? (
        <p style={{ marginTop: "1.5rem", color: "var(--color-text-secondary)" }}>Пока нет услуг. Добавьте первую или примените миграции БД.</p>
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
          {services.map((s) => (
            <li
              key={s.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
              }}
            >
              <div style={{ flex: "1 1 12rem", minWidth: 0 }}>
                <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{s.name}</div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                  В договоре: <strong style={{ color: "var(--color-text)" }}>{extraServicePriceColumn(s)}</strong>
                  <span style={{ marginLeft: "0.5rem" }}>· порядок {s.sortOrder}</span>
                  {!s.active ? (
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        fontSize: "0.75rem",
                        padding: "0.1rem 0.35rem",
                        borderRadius: "4px",
                        background: "var(--color-border)",
                      }}
                    >
                      выкл.
                    </span>
                  ) : null}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexShrink: 0 }}>
                <Link href={`/admin-panel/extra-services/${s.id}/edit`} style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
                  Изменить
                </Link>
                <DeleteExtraServiceButton serviceId={s.id} label={s.name} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
