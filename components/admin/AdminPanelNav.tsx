import Link from "next/link";

export function AdminPanelNav({ isOwner = false }: { isOwner?: boolean }) {
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
        Шахматка
      </Link>
      <Link href="/admin-panel/orders" className="nav-tap-target" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
        Заказы
      </Link>
      <Link
        href="/admin-panel/extra-services"
        className="nav-tap-target"
        style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}
      >
        Доп. услуги
      </Link>
      {isOwner ? (
        <Link href="/admin-panel/staff" className="nav-tap-target" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
          Сотрудники
        </Link>
      ) : null}
      <Link href="/" className="nav-tap-target" style={{ fontSize: "var(--text-sm)" }}>
        Сайт
      </Link>
      {isOwner ? (
        // eslint-disable-next-line @next/next/no-html-link-for-pages -- The editor returns a complete HTML document.
        <a
          href="/admin-panel/ai-editor/"
          className="nav-tap-target"
          style={{
            padding: "0.45rem 0.9rem",
            borderRadius: "999px",
            border: "1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)",
            background: "color-mix(in srgb, var(--color-accent) 9%, transparent)",
            color: "var(--color-accent)",
            fontSize: "var(--text-sm)",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          ИИ-редактор
        </a>
      ) : null}
      <Link
        href="/admin-panel/accounting"
        className="nav-tap-target"
        style={{
          marginLeft: "0.25rem",
          padding: "0.55rem 1.1rem",
          borderRadius: "999px",
          background: "var(--color-accent)",
          color: "#fff",
          fontSize: "var(--text-base)",
          fontWeight: 700,
          textDecoration: "none",
          letterSpacing: "0.01em",
          boxShadow: "0 2px 8px color-mix(in srgb, var(--color-accent) 35%, transparent)",
        }}
      >
        УЧЕТ Пальма и Пальмаавто
      </Link>
    </nav>
  );
}
