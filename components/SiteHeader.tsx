import Link from "next/link";

import { PublicAuthNav } from "@/components/PublicAuthNav";

/**
 * Верхняя панель сайта: логотип/название и основные ссылки.
 * Управление автопарком и бронями — через `/admin-panel`.
 */
export function SiteHeader() {
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
          <Link href="/cars" className="nav-tap-target" style={{ fontSize: "var(--text-sm)" }}>
            Каталог
          </Link>
          <Link href="/book" className="nav-tap-target" style={{ fontSize: "var(--text-sm)" }}>
            По датам
          </Link>
          <PublicAuthNav />
        </nav>
      </div>
    </header>
  );
}
