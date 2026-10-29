import Link from "next/link";

/** Переключатель в стиле Apple (серая дорожка, выбранный — белая плашка). Пункты — обычные ссылки, работает без JS. */
export function SegmentedLinks({ items, label }: { items: { href: string; label: string; active: boolean; title?: string }[]; label: string }) {
  return (
    <nav
      aria-label={label}
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        gap: "2px",
        padding: "3px",
        borderRadius: "calc(var(--radius-md) - 2px)",
        background: "var(--color-border)",
        maxWidth: "100%",
      }}
    >
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          title={it.title}
          aria-current={it.active ? "page" : undefined}
          style={{
            padding: "0.4rem 0.9rem",
            borderRadius: "calc(var(--radius-md) - 4px)",
            background: it.active ? "var(--color-surface)" : "transparent",
            boxShadow: it.active ? "0 1px 3px rgba(0,0,0,0.12)" : undefined,
            color: "var(--color-text)",
            fontWeight: it.active ? 600 : 400,
            fontSize: "var(--text-sm)",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
