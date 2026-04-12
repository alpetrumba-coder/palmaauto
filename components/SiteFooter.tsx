import Link from "next/link";

/**
 * Нижний колонтитул публичной части.
 * На этапе 1 — минимальный; позже можно добавить контакты, юридические ссылки.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="site-footer"
      style={{
        marginTop: "auto",
        paddingTop: "calc(var(--space-unit) * 3)",
        paddingInline: "var(--page-padding)",
        borderTop: "1px solid var(--color-border)",
        color: "var(--color-text-secondary)",
        fontSize: "var(--text-sm)",
        textAlign: "center",
      }}
    >
      <p style={{ margin: "0 0 0.75rem" }}>
        <Link
          href="/admin-panel/login"
          className="nav-tap-target"
          style={{ fontWeight: 600, color: "var(--color-text-secondary)", textDecoration: "none" }}
        >
          Админпанель
        </Link>
      </p>
      <p style={{ margin: 0 }}>© {year} ПальмаАвто. Каталог и бронь на сайте.</p>
    </footer>
  );
}
