import type { Metadata } from "next";
import Link from "next/link";

import { AccountingDocTabs } from "@/components/admin/AccountingDocTabs";
import { BINDING_LABEL, EXPENSE_RULES, GENERAL_RULES, INCOME_RULES, OPEN_QUESTIONS, type Binding } from "@/lib/accounting-rules";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";

export const metadata: Metadata = {
  title: "Правила учёта — админ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const cell: React.CSSProperties = { padding: "0.45rem 0.7rem", borderBottom: "1px solid var(--color-border)", verticalAlign: "top" };
const head: React.CSSProperties = { ...cell, fontWeight: 600, textAlign: "left", background: "var(--color-surface)" };
const h2: React.CSSProperties = { fontSize: "var(--text-lg)", margin: "1.6rem 0 0.5rem" };

const BADGE: Record<Binding, string> = {
  deal: "color-mix(in srgb, #2f6fb0 16%, transparent)",
  object: "color-mix(in srgb, #2e8b57 16%, transparent)",
  general: "color-mix(in srgb, #8a8a8a 18%, transparent)",
  distributed: "color-mix(in srgb, #b8860b 18%, transparent)",
  adjust: "color-mix(in srgb, #b00020 14%, transparent)",
  off: "transparent",
};

export default async function AccountingRulesPage() {
  await requireAdminPanelSession();
  const count = (b: Binding) => EXPENSE_RULES.filter((r) => r.binding === b).length;

  return (
    <>
      <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)" }}>
        <Link href="/admin-panel/accounting">← К остаткам и журналу</Link>
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.75rem" }}>Правила учёта</h1>
      <AccountingDocTabs active="rules" />
      <p style={{ margin: 0, maxWidth: "46rem", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
        Свод правил на 28.10.2026: к чему привязывать каждый расход и какие статьи используем. Названия статей в «Справочниках» пока старые — переименуем после
        подтверждения владельца.
      </p>

      <h2 style={h2}>Общие правила</h2>
      <ol style={{ margin: 0, paddingLeft: "1.2rem", maxWidth: "46rem", fontSize: "var(--text-sm)", lineHeight: 1.5 }}>
        {GENERAL_RULES.map((t) => (
          <li key={t} style={{ marginBottom: "0.35rem" }}>
            {t}
          </li>
        ))}
      </ol>

      <h2 style={h2}>Статьи прихода</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
          <thead>
            <tr>
              <th style={head}>Статья</th>
              <th style={head}>Что с ней в системе сейчас</th>
            </tr>
          </thead>
          <tbody>
            {INCOME_RULES.map((r) => (
              <tr key={r.name}>
                <td style={{ ...cell, fontWeight: 600 }}>{r.name}</td>
                <td style={{ ...cell, color: "var(--color-text-secondary)" }}>{r.was}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={h2}>Статьи расхода: к чему привязывать</h2>
      <p style={{ margin: "0 0 0.6rem", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
        К заезду: {count("deal")} · распределяются по броням: {count("distributed")} · к объекту: {count("object")} · общие: {count("general")} · возврат клиенту: {count("adjust")} · не
        используем: {count("off")}.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
          <thead>
            <tr>
              <th style={head}>№</th>
              <th style={head}>Статья</th>
              <th style={head}>Привязка</th>
              <th style={head}>Примечание</th>
            </tr>
          </thead>
          <tbody>
            {EXPENSE_RULES.map((r) => (
              <tr key={r.n} style={{ opacity: r.binding === "off" ? 0.6 : 1 }}>
                <td style={cell}>{r.n}</td>
                <td style={{ ...cell, fontWeight: 600 }}>
                  {r.name}
                  {r.was ? <div style={{ fontWeight: 400, fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>сейчас: «{r.was}»</div> : null}
                </td>
                <td style={cell}>
                  <span style={{ display: "inline-block", padding: "0.1rem 0.5rem", borderRadius: "999px", background: BADGE[r.binding], border: r.binding === "off" ? "1px dashed var(--color-border)" : "none" }}>
                    {BINDING_LABEL[r.binding]}
                  </span>
                </td>
                <td style={{ ...cell, color: r.open ? "var(--color-danger, #b00020)" : "var(--color-text-secondary)" }}>{r.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={h2}>Что осталось сделать в программе</h2>
      <ul style={{ margin: 0, paddingLeft: "1.2rem", maxWidth: "46rem", fontSize: "var(--text-sm)", lineHeight: 1.5 }}>
        {OPEN_QUESTIONS.map((t) => (
          <li key={t} style={{ marginBottom: "0.3rem" }}>
            {t}
          </li>
        ))}
      </ul>
    </>
  );
}
