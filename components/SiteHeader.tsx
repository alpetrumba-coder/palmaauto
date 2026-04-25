import Link from "next/link";

import { PublicAuthNav } from "@/components/PublicAuthNav";
import { PalmaAutoLogo } from "@/components/PalmaAutoLogo";
import { LEGAL_DOCS } from "@/lib/legal-docs";

/**
 * Верхняя панель сайта: логотип/название и основные ссылки.
 * Управление автопарком и бронями — через `/admin-panel`.
 */
export function SiteHeader() {
  const phoneDisplay = "+7 940 714-62-73";
  const phoneTel = "+79407146273";
  const whatsappHref = "https://wa.me/79407146273";
  const telegramHref = "https://t.me/PalmaAppartmentsAbkhazia";
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
        data-site-header-row
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
          <span data-site-header-logo>
            <PalmaAutoLogo />
          </span>
        </Link>
        <div
          data-site-header-right
          style={{ display: "flex", gap: "0.75rem 1.25rem", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}
        >
          <div data-site-header-contacts style={{ display: "flex", gap: "0.5rem 0.9rem", flexWrap: "wrap", alignItems: "center" }}>
            <a
              href={`tel:${phoneTel}`}
              className="nav-tap-target"
              style={{ paddingInline: 0, textDecoration: "none", color: "var(--color-text)", fontSize: "var(--text-sm)", fontWeight: 600 }}
            >
              {phoneDisplay}
            </a>
            <span data-site-header-dot aria-hidden="true" style={{ color: "var(--color-border)" }}>
              ·
            </span>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="nav-tap-target"
              style={{ paddingInline: 0, textDecoration: "none", color: "var(--color-text)", fontSize: "var(--text-sm)" }}
            >
              WhatsApp
            </a>
            <span data-site-header-dot aria-hidden="true" style={{ color: "var(--color-border)" }}>
              ·
            </span>
            <a
              href={telegramHref}
              target="_blank"
              rel="noreferrer"
              className="nav-tap-target"
              style={{ paddingInline: 0, textDecoration: "none", color: "var(--color-text)", fontSize: "var(--text-sm)" }}
            >
              Telegram
            </a>
          </div>
          <nav data-site-header-nav aria-label="Основная навигация" style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
            <Link href="/cars" className="nav-tap-target" style={{ fontSize: "var(--text-sm)" }}>
              Каталог
            </Link>
            <Link href={LEGAL_DOCS.conditions.path} className="nav-tap-target" style={{ fontSize: "var(--text-sm)" }}>
              Условия
            </Link>
            <PublicAuthNav />
          </nav>
        </div>
      </div>
    </header>
  );
}
