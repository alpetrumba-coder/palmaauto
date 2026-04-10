import Link from "next/link";

type SiteHeaderProps = {
  /** `public` — витрина; `internal` — внутренняя зона (другой акцент в навигации). */
  variant: "public" | "internal";
};

/**
 * Верхняя панель сайта: логотип/название и основные ссылки.
 * Стили через inline + CSS-переменные, чтобы не тянуть дополнительные библиотеки на этапе 1.
 */
export function SiteHeader({ variant }: SiteHeaderProps) {
  return (
    <header
      className="site-header"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "color-mix(in srgb, var(--color-bg) 85%, transparent)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div
        className="page-shell"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          minHeight: "52px",
          paddingBlock: "0.65rem",
        }}
      >
        <Link
          href="/"
          className="nav-tap-target"
          style={{
            fontWeight: 600,
            fontSize: "var(--text-lg)",
            color: "var(--color-text)",
            textDecoration: "none",
          }}
        >
          ПальмаАвто
        </Link>
        <nav aria-label="Основная навигация" style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
          {variant === "public" ? (
            <>
              <span
                className="nav-tap-target"
                style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}
              >
                Каталог — скоро
              </span>
              <Link href="/staff" className="nav-tap-target" style={{ fontSize: "var(--text-sm)" }}>
                Для сотрудников
              </Link>
            </>
          ) : (
            <>
              <Link href="/staff" className="nav-tap-target" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
                Панель
              </Link>
              <Link href="/" className="nav-tap-target" style={{ fontSize: "var(--text-sm)" }}>
                Сайт
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
