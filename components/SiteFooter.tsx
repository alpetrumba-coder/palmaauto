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
      © {year} ПальмаАвто. Каталог (этап 2); дальше — регистрация и бронь.
    </footer>
  );
}
