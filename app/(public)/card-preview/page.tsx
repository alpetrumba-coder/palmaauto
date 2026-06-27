import Link from "next/link";

import { CARD_PREVIEW_VARIANTS } from "@/lib/card-preview-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Превью карточек · ПальмаАвто",
  robots: { index: false, follow: false },
};

/** Список ссылок на варианты карточки. */
export default function CardPreviewIndexPage() {
  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 4rem)" }}>
      <h1 style={{ fontSize: "var(--text-hero)", margin: "0 0 0.5rem", letterSpacing: "0.02em" }}>Варианты карточки</h1>
      <p style={{ margin: "0 0 2rem", color: "var(--color-text-secondary)", maxWidth: "40rem", lineHeight: 1.6 }}>
        На примере Nissan Note. Откройте каждый вариант отдельно:
      </p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "28rem" }}>
        {CARD_PREVIEW_VARIANTS.map((v) => (
          <li key={v.id}>
            <Link
              href={`/card-preview/${v.id}`}
              style={{
                display: "block",
                padding: "1rem 1.15rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                textDecoration: "none",
                color: "inherit",
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-accent)" }}>
                Вариант {v.label}
              </p>
              <p style={{ margin: "0.25rem 0 0", fontSize: "var(--text-lg)", fontWeight: 700 }}>{v.title}</p>
              <p style={{ margin: "0.35rem 0 0", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: 1.45 }}>{v.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
