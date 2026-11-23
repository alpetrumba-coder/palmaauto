import Link from "next/link";

const TABS = [
  { href: "/admin-panel/remont-akirtava", key: "home", label: "Обзор" },
  { href: "/admin-panel/remont-akirtava/files/planirovka.pdf", key: "plan", label: "Планировка", external: true },
  { href: "/admin-panel/remont-akirtava/smeta", key: "smeta", label: "Смета" },
  { href: "/admin-panel/remont-akirtava/nakladnye", key: "docs", label: "Накладные" },
  { href: "/admin-panel/remont-akirtava/balans", key: "balance", label: "Баланс" },
];

/** Кнопки раздела «Ремонт Акиртава». */
export function RepairNav({ active }: { active: string }) {
  return (
    <nav style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            target={t.external ? "_blank" : undefined}
            prefetch={t.external ? false : undefined}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "999px",
              fontWeight: 700,
              textDecoration: "none",
              background: on ? "var(--color-accent)" : "transparent",
              color: on ? "#fff" : "var(--color-accent)",
              border: "1px solid var(--color-accent)",
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
