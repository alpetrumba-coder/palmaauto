import Link from "next/link";

export function AdminPanelNav() {
  return (
    <nav aria-label="Админ-панель" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
      <Link href="/admin-panel" className="nav-tap-target" style={{ fontSize: "var(--text-sm)" }}>
        Обзор
      </Link>
      <Link
        href="/admin-panel/cars"
        className="nav-tap-target"
        style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}
      >
        Автомобили в прокате
      </Link>
      <Link href="/admin-panel/users" className="nav-tap-target" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
        Пользователи
      </Link>
      <Link href="/admin-panel/bookings" className="nav-tap-target" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
        Бронирование
      </Link>
      <Link href="/" className="nav-tap-target" style={{ fontSize: "var(--text-sm)" }}>
        Сайт
      </Link>
    </nav>
  );
}
