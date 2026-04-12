import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Админ-панель",
  robots: { index: false, follow: false },
};

export default function AdminPanelHomePage() {
  return (
    <>
      <h1 style={{ fontSize: "var(--text-3xl)", marginTop: 0 }}>Админ-панель</h1>
      <p style={{ color: "var(--color-text-secondary)", marginTop: "0.5rem" }}>
        Управление каталогом, бронями и пользователями.
      </p>
      <div style={{ marginTop: "calc(var(--space-unit) * 2)", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Link
            href="/admin-panel/cars"
            className="nav-tap-target"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.85rem 1.25rem",
              borderRadius: "999px",
              background: "var(--color-accent)",
              color: "#fff",
              fontWeight: 600,
              textDecoration: "none",
              maxWidth: "22rem",
            }}
          >
            Автомобили в прокате
          </Link>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
            Добавление, редактирование и удаление машин и фото (URL).
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Link
            href="/admin-panel/users"
            className="nav-tap-target"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.85rem 1.25rem",
              borderRadius: "999px",
              background: "var(--color-accent)",
              color: "#fff",
              fontWeight: 600,
              textDecoration: "none",
              maxWidth: "22rem",
            }}
          >
            Пользователи
          </Link>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
            Клиенты: ФИО, email, телефон, адрес, паспортные данные.
          </p>
        </div>
      </div>
    </>
  );
}
