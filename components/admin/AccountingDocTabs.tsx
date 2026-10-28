import Link from "next/link";

/** Переключатель вкладок «Правила» / «Договорённости» / «Инструкция по боту» — общий для всех трёх страниц. */
export function AccountingDocTabs({ active }: { active: "rules" | "agreements" | "bot" }) {
  const tab = (isActive: boolean): React.CSSProperties => ({
    padding: "0.4rem 0.9rem",
    borderRadius: "999px",
    border: isActive ? "2px solid var(--color-accent)" : "1px solid var(--color-border)",
    background: isActive ? "var(--color-surface)" : "transparent",
    color: "var(--color-text)",
    fontWeight: isActive ? 700 : 400,
    fontSize: "var(--text-sm)",
    textDecoration: "none",
  });
  return (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: "0 0 1rem" }}>
      <Link href="/admin-panel/accounting/rules" style={tab(active === "rules")}>
        Правила
      </Link>
      <Link href="/admin-panel/accounting/agreements" style={tab(active === "agreements")}>
        Договорённости
      </Link>
      <Link href="/admin-panel/accounting/bot" style={tab(active === "bot")}>
        Инструкция по боту
      </Link>
    </div>
  );
}
