import type { Metadata } from "next";
import Link from "next/link";

import { AccountingDocTabs } from "@/components/admin/AccountingDocTabs";
import { AGREEMENT_RULES, COMMISSIONS, DEFINITIONS, OWNER_SETTLEMENTS, PURCHASE_RULES } from "@/lib/accounting-agreements";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";

export const metadata: Metadata = {
  title: "Договорённости — админ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const cell: React.CSSProperties = { padding: "0.45rem 0.7rem", borderBottom: "1px solid var(--color-border)", verticalAlign: "top" };
const head: React.CSSProperties = { ...cell, fontWeight: 600, textAlign: "left", background: "var(--color-surface)" };
const h2: React.CSSProperties = { fontSize: "var(--text-lg)", margin: "1.6rem 0 0.5rem" };

export default async function AccountingAgreementsPage() {
  await requireAdminPanelSession();
  return (
    <>
      <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)" }}>
        <Link href="/admin-panel/accounting">← К остаткам и журналу</Link>
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.75rem" }}>Договорённости</h1>
      <AccountingDocTabs active="agreements" />

      <h2 style={{ ...h2, marginTop: 0 }}>Как понимаем суммы</h2>
      <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "var(--text-sm)", lineHeight: 1.5 }}>
        {DEFINITIONS.map((d) => (
          <li key={d.term}>
            <b>{d.term}</b> — {d.meaning}
          </li>
        ))}
      </ul>

      <h2 style={h2}>Комиссии сотрудников</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", maxWidth: "46rem", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
          <thead>
            <tr>
              <th style={head}>Кто</th>
              <th style={head}>За что</th>
              <th style={head}>Ставка</th>
              <th style={head}>От чего</th>
              <th style={head}>Примечание</th>
            </tr>
          </thead>
          <tbody>
            {COMMISSIONS.map((c, i) => (
              <tr key={i}>
                <td style={{ ...cell, fontWeight: 600 }}>{c.who}</td>
                <td style={cell}>{c.area}</td>
                <td style={{ ...cell, fontWeight: 600 }}>{c.pct}%</td>
                <td style={cell}>от суммы {c.base}</td>
                <td style={{ ...cell, color: "var(--color-text-secondary)" }}>{c.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={h2}>Когда выплачиваем</h2>
      <ul style={{ margin: 0, paddingLeft: "1.2rem", maxWidth: "46rem", fontSize: "var(--text-sm)", lineHeight: 1.5 }}>
        {AGREEMENT_RULES.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      <h2 style={h2}>Закупки для нужд Пальмы</h2>
      <ul style={{ margin: 0, paddingLeft: "1.2rem", maxWidth: "46rem", fontSize: "var(--text-sm)", lineHeight: 1.5 }}>
        {PURCHASE_RULES.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      <h2 style={h2}>Взаиморасчёты с хозяином квартиры</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", maxWidth: "46rem", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
          <thead>
            <tr>
              <th style={head}>Собственник</th>
              <th style={head}>Ему / нам</th>
              <th style={head}>База</th>
              <th style={head}>Примечание</th>
            </tr>
          </thead>
          <tbody>
            {OWNER_SETTLEMENTS.map((o) => (
              <tr key={o.owner}>
                <td style={{ ...cell, fontWeight: 600 }}>{o.owner}</td>
                <td style={{ ...cell, fontWeight: 600 }}>{o.split}</td>
                <td style={cell}>{o.base}</td>
                <td style={{ ...cell, color: "var(--color-text-secondary)" }}>{o.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
