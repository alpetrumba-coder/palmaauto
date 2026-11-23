import type { Metadata } from "next";

import smeta from "@/lib/remont-akirtava-smeta.json";

import { RepairNav } from "../RepairNav";

export const metadata: Metadata = {
  title: "Смета — ремонт Акиртава",
  robots: { index: false, follow: false },
};

type Item = (typeof smeta.items)[number];

const rub = (n: number | null) =>
  n == null ? "" : n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function groupBySection(items: Item[]) {
  const groups = new Map<string, Item[]>();
  for (const it of items) {
    const key = it.section || "Прочее";
    groups.set(key, [...(groups.get(key) ?? []), it]);
  }
  return [...groups.entries()].map(([section, rows]) => ({
    section,
    rows,
    sum: rows.reduce((s, r) => s + (r.sum ?? 0), 0),
  }));
}


const cell: React.CSSProperties = { padding: "0.35rem 0.5rem", borderBottom: "1px solid var(--color-border)" };
const num: React.CSSProperties = { ...cell, textAlign: "right", whiteSpace: "nowrap" };

function SmetaPart({ title, items, total }: { title: string; items: Item[]; total: number }) {
  return (
    <section style={{ marginTop: "1.5rem" }}>
      <h3 style={{ marginBottom: "0.5rem" }}>
        {title} — {rub(total)} ₽
      </h3>
      {groupBySection(items).map((g) => (
        <details key={g.section} style={{ marginBottom: "0.5rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>
            {g.section} · {g.rows.length} поз. · {rub(g.sum)} ₽
          </summary>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)", marginTop: "0.5rem" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--color-text-secondary)" }}>
                  <th style={cell}>Раздел</th>
                  <th style={cell}>Наименование</th>
                  <th style={cell}>Ед.</th>
                  <th style={num}>Кол-во</th>
                  <th style={num}>Цена, ₽</th>
                  <th style={num}>Сумма, ₽</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ ...cell, color: "var(--color-text-secondary)" }}>{r.subsection}</td>
                    <td style={cell}>{r.name}</td>
                    <td style={cell}>{r.unit}</td>
                    <td style={num}>{rub(r.qty)}</td>
                    <td style={num}>{rub(r.price)}</td>
                    <td style={num}>{rub(r.sum)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </section>
  );
}

export default function RemontAkirtavaSmetaPage() {
  const materials = smeta.items.filter((i) => i.kind === "material");
  const works = smeta.items.filter((i) => i.kind === "work");
  const t = smeta.totals;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <h1>Ремонт Акиртава</h1>
      <RepairNav active="smeta" />

      <section>
        <h2 style={{ marginBottom: "0.25rem" }}>Смета № {smeta.number} — окончание ремонта</h2>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
          Источник: {smeta.source}. Ответственный — Д. Леготкин.
        </p>
        <table style={{ borderCollapse: "collapse", marginTop: "0.5rem" }}>
          <tbody>
            <tr><td style={cell}>Материалы</td><td style={num}>{rub(t.materials)} ₽</td></tr>
            <tr><td style={cell}>Работы</td><td style={num}>{rub(t.works)} ₽</td></tr>
            <tr><td style={cell}>Итого по смете</td><td style={num}>{rub(t.subtotal)} ₽</td></tr>
            <tr><td style={cell}>Накладные расходы 5%</td><td style={num}>{rub(t.overhead)} ₽</td></tr>
            <tr><td style={cell}>Всего по смете Леготкина</td><td style={num}>{rub(t.total)} ₽</td></tr>
            <tr style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }}>
              <td style={{ ...cell, fontWeight: 600 }}>Гонорар прораба — {smeta.foreman}</td>
              <td style={{ ...num, fontWeight: 600 }}>{rub(t.foremanFee)} ₽</td>
            </tr>
            <tr><td style={{ ...cell, fontWeight: 700 }}>Всего с гонораром прораба</td><td style={{ ...num, fontWeight: 700 }}>{rub(t.grandTotal)} ₽</td></tr>
          </tbody>
        </table>

        <SmetaPart title="Материалы" items={materials} total={t.materials} />
        <SmetaPart title="Работы" items={works} total={t.works} />
      </section>
    </div>
  );
}
