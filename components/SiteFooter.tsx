import Link from "next/link";

/**
 * Нижний колонтитул публичной части.
 * На этапе 1 — минимальный; позже можно добавить контакты, юридические ссылки.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  const phoneDisplay = "+7 940 714-62-73";
  const phoneTel = "+79407146273";
  const whatsappHref = "https://wa.me/79407146273";
  const telegramHref = "https://t.me/PalmaAppartmentsAbkhazia";
  const email = "palm@tdrubin.com";
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
      <nav aria-label="Ссылки в подвале" style={{ display: "flex", gap: "0.75rem 1.25rem", justifyContent: "center", flexWrap: "wrap" }}>
        <Link
          href="/o-kompanii"
          className="nav-tap-target"
          style={{ fontWeight: 600, color: "var(--color-text-secondary)", textDecoration: "none" }}
        >
          О компании
        </Link>
        <Link
          href="/poryadok-zakaza"
          className="nav-tap-target"
          style={{ fontWeight: 600, color: "var(--color-text-secondary)", textDecoration: "none" }}
        >
          Порядок оформления и оплаты
        </Link>
        <Link
          href="/admin-panel/login"
          className="nav-tap-target"
          style={{ fontWeight: 600, color: "var(--color-text-secondary)", textDecoration: "none" }}
        >
          Админпанель
        </Link>
      </nav>
      <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem 1rem", justifyContent: "center", flexWrap: "wrap" }}>
        <a href={`tel:${phoneTel}`} className="nav-tap-target" style={{ paddingInline: 0, color: "inherit", textDecoration: "none", fontWeight: 600 }}>
          {phoneDisplay}
        </a>
        <span aria-hidden="true">·</span>
        <a href={whatsappHref} target="_blank" rel="noreferrer" className="nav-tap-target" style={{ paddingInline: 0, color: "inherit", textDecoration: "none", fontWeight: 600 }}>
          WhatsApp
        </a>
        <span aria-hidden="true">·</span>
        <a href={telegramHref} target="_blank" rel="noreferrer" className="nav-tap-target" style={{ paddingInline: 0, color: "inherit", textDecoration: "none", fontWeight: 600 }}>
          Telegram
        </a>
        <span aria-hidden="true">·</span>
        <a href={`mailto:${email}`} className="nav-tap-target" style={{ paddingInline: 0, color: "inherit", textDecoration: "none", fontWeight: 600 }}>
          {email}
        </a>
      </div>
      <p style={{ margin: 0 }}>© {year} ПальмаАвто. Каталог и бронь на сайте.</p>
    </footer>
  );
}
