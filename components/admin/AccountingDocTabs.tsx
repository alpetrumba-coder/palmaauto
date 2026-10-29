import { SegmentedLinks } from "@/components/admin/SegmentedLinks";

/** Переключатель вкладок «Правила» / «Договорённости» / «Инструкция по боту» — общий для всех трёх страниц. */
export function AccountingDocTabs({ active }: { active: "rules" | "agreements" | "bot" }) {
  return (
    <div style={{ margin: "0 0 1rem" }}>
      <SegmentedLinks
        label="Справка по учёту"
        items={[
          { href: "/admin-panel/accounting/rules", label: "Правила", active: active === "rules" },
          { href: "/admin-panel/accounting/agreements", label: "Договорённости", active: active === "agreements" },
          { href: "/admin-panel/accounting/bot", label: "Инструкция по боту", active: active === "bot" },
        ]}
      />
    </div>
  );
}
