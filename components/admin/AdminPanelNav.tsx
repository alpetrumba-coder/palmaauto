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
      <Link href="/" className="nav-tap-target" style={{ fontSize: "var(--text-sm)" }}>
        Сайт
      </Link>
    </nav>
  );
}
