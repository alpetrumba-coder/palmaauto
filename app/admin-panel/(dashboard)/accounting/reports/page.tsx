import type { Metadata } from "next";
import Link from "next/link";

import { buildReport, cellText, isReportKind, parsePeriod, REPORT_TITLES, type ReportKind } from "@/lib/reports";
import { SegmentedLinks } from "@/components/admin/SegmentedLinks";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";

export const metadata: Metadata = {
  title: "Отчёты — админ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SP = { r?: string; from?: string; to?: string; preset?: string; asset?: string; alloc?: string; hist?: string };

const field: React.CSSProperties = {
  padding: "0.45rem 0.55rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
  font: "inherit",
};
const cell: React.CSSProperties = { padding: "0.5rem 0.7rem", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" };
const PRESETS = [
  ["prev", "Прошлый месяц"],
  ["cur", "Этот месяц"],
  ["ytd", "С начала года"],
  ["all", "За всё время"],
] as const;

const REPORT_HINTS: Record<ReportKind, string> = {
  objects: "Доходы и расходы по каждой квартире и машине за период — сколько заработал объект; под результатом — сколько выведено в «Кассу Рубина».",
  months: "Те же цифры помесячно: видно сезонность и динамику.",
  owners: "Сколько причитается стороннему собственнику (Виктору — 65% от нетто его броней), сколько уже выплачено и разница.",
  cash: "Остаток на начало, приходы, расходы, перемещения и остаток на конец по каждой кассе.",
  bonus: "Комиссии сотрудников за период — выплачиваются после закрытия месяца.",
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdminPanelSession();
  const sp = await searchParams;
  const kind: ReportKind = isReportKind(sp.r) ? sp.r : "objects";
  const period = parsePeriod(sp);
  const assets = await prisma.asset.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } });

  const opts = { assetId: sp.asset || undefined, alloc: sp.alloc === "1", includeImported: sp.hist === "1" };
  const table = await buildReport(kind, period, opts);

  const qs = (extra: Record<string, string | undefined> = {}) => {
    const q = new URLSearchParams();
    const base: Record<string, string | undefined> = { r: kind, from: period.fromStr, to: period.toStr, asset: sp.asset, alloc: sp.alloc, hist: sp.hist, ...extra };
    for (const [k, v] of Object.entries(base)) if (v) q.set(k, v);
    return q.toString();
  };
  const usesAsset = kind === "objects" || kind === "months";

  return (
    <>
      <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)" }}>
        <Link href="/admin-panel/accounting">← К остаткам и журналу</Link>
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.75rem" }}>Отчёты</h1>

      <div style={{ margin: "0 0 0.4rem" }}>
        <SegmentedLinks
          label="Отчёты"
          items={(Object.keys(REPORT_TITLES) as ReportKind[]).map((k) => ({
            href: `/admin-panel/accounting/reports?${new URLSearchParams({ r: k, from: period.fromStr, to: period.toStr }).toString()}`,
            label: REPORT_TITLES[k],
            title: REPORT_HINTS[k],
            active: k === kind,
          }))}
        />
      </div>
      <p style={{ margin: "0 0 0.9rem", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>{REPORT_HINTS[kind]}</p>

      <div style={{ marginBottom: "0.75rem" }}>
        <SegmentedLinks
          label="Период"
          items={PRESETS.map(([id, label]) => ({
            href: `/admin-panel/accounting/reports?${new URLSearchParams({ r: kind, preset: id, ...(sp.asset ? { asset: sp.asset } : {}), ...(sp.alloc ? { alloc: sp.alloc } : {}), ...(sp.hist ? { hist: sp.hist } : {}) }).toString()}`,
            label,
            active: (({ fromStr, toStr }) => fromStr === period.fromStr && toStr === period.toStr)(parsePeriod({ preset: id })),
          }))}
        />
      </div>

      <form method="get" style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "end", marginBottom: "1rem", fontSize: "var(--text-sm)" }}>
        <input type="hidden" name="r" value={kind} />
        <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          С
          <input type="date" name="from" defaultValue={period.fromStr} style={field} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          По
          <input type="date" name="to" defaultValue={period.toStr} style={field} />
        </label>
        {usesAsset ? (
          <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            Объект
            <select name="asset" defaultValue={sp.asset ?? ""} style={field}>
              <option value="">все</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {kind === "objects" ? (
          <label style={{ display: "flex", gap: "0.35rem", alignItems: "center", paddingBottom: "0.45rem" }}>
            <input type="checkbox" name="alloc" value="1" defaultChecked={sp.alloc === "1"} />
            распределить общие расходы по объектам
          </label>
        ) : null}
        {kind === "cash" ? (
          <label style={{ display: "flex", gap: "0.35rem", alignItems: "center", paddingBottom: "0.45rem" }}>
            <input type="checkbox" name="hist" value="1" defaultChecked={sp.hist === "1"} />
            включая перенесённую историю
          </label>
        ) : null}
        <button type="submit" style={{ ...field, cursor: "pointer", fontWeight: 600 }}>
          Показать
        </button>
        <a href={`/admin-panel/accounting/reports/export?${qs()}`} style={{ paddingBottom: "0.45rem", fontWeight: 600 }}>
          Выгрузить в Excel
        </a>
      </form>

      <h2 style={{ fontSize: "var(--text-lg)", margin: "0 0 0.4rem" }}>{table.title}</h2>
      {table.notes.map((n, i) => (
        <p key={i} style={{ margin: "0 0 0.3rem", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", maxWidth: "62rem" }}>
          {n}
        </p>
      ))}

      {table.rows.length === 0 ? (
        <p style={{ marginTop: "1rem" }}>За выбранный период данных нет.</p>
      ) : (
        <div style={{ overflowX: "auto", marginTop: "0.9rem" }}>
          <table style={{ borderCollapse: "collapse", fontSize: "var(--text-sm)", minWidth: "100%" }}>
            <thead>
              <tr style={{ background: "var(--color-surface)", textAlign: "left" }}>
                {table.headers.map((h, i) => (
                  <th key={i} style={{ ...cell, fontWeight: 600, textAlign: i === 0 ? "left" : "right", whiteSpace: "normal", minWidth: i === 0 ? "14rem" : "7rem" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, ri) => {
                const strong = table.bold.includes(ri);
                return (
                  <tr key={ri} style={{ fontWeight: strong ? 700 : 400, background: strong ? "var(--color-surface)" : undefined }}>
                    {r.map((c, ci) => (
                      <td key={ci} style={{ ...cell, textAlign: typeof c === "string" && ci < 3 && kind !== "months" ? "left" : ci === 0 ? "left" : "right", whiteSpace: ci === 0 ? "normal" : "nowrap" }}>
                        {cellText(c)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
