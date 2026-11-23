import type { Metadata } from "next";
import Link from "next/link";

import { formatKop } from "@/lib/money";
import { computeBalance } from "@/lib/repair";

import { RepairNav } from "../RepairNav";

export const metadata: Metadata = {
  title: "Баланс — ремонт Акиртава",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const cell: React.CSSProperties = { padding: "0.3rem 0.5rem", borderBottom: "1px solid var(--color-border)" };
const num: React.CSSProperties = { ...cell, textAlign: "right", whiteSpace: "nowrap" };
const RED = "#c0392b";
const KIND_TITLE: Record<string, string> = { material: "Материалы", work: "Работы", fee: "Гонорар прораба", overhead: "Накладные расходы по смете" };

const qtyFmt = (n: number | null) => (n == null ? "" : n.toLocaleString("ru-RU", { maximumFractionDigits: 3 }));

export default async function RepairBalancePage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const sp = await searchParams;
  const showAll = sp.all === "1";
  const b = await computeBalance();
  let lastKind = "";

  return (
    <div>
      <h1>Ремонт Акиртава</h1>
      <RepairNav active="balance" />
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
        По каждому разделу сметы: сколько заложено, сколько уже взято/оплачено и сколько осталось. Красным — перерасход.
        Раскройте раздел, чтобы увидеть позиции.{" "}
        {showAll ? <Link href="?">Показать только позиции с движением</Link> : <Link href="?all=1">Показать все позиции сметы</Link>}
      </p>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "0.5rem" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--color-text-secondary)" }}>
              <th style={cell}>Раздел</th>
              <th style={num}>По смете</th>
              <th style={num}>Взято / оплачено</th>
              <th style={num}>Осталось</th>
              <th style={num}>%</th>
            </tr>
          </thead>
          <tbody>
            {b.sections.map((s) => {
              const head =
                s.kind !== lastKind ? (
                  <tr key={`h-${s.kind}`}>
                    <td colSpan={5} style={{ ...cell, fontWeight: 700, paddingTop: "1rem" }}>
                      {KIND_TITLE[s.kind] ?? s.kind}
                    </td>
                  </tr>
                ) : null;
              lastKind = s.kind;
              const left = s.plannedKop - s.takenKop;
              const over = left < 0;
              const rows = s.rows.filter((r) => showAll || r.lines > 0);
              return [
                head,
                <tr key={`${s.kind}|${s.section}`}>
                  <td style={cell}>
                    <details>
                      <summary style={{ cursor: "pointer" }}>{s.section}</summary>
                      {rows.length === 0 ? (
                        <div style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", padding: "0.3rem 0" }}>
                          Пока ничего не взято. <Link href="?all=1">Все позиции</Link>
                        </div>
                      ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)", margin: "0.4rem 0" }}>
                          <thead>
                            <tr style={{ textAlign: "left", color: "var(--color-text-secondary)" }}>
                              <th style={cell}>Позиция</th>
                              <th style={num}>Кол-во по смете</th>
                              <th style={num}>Взято</th>
                              <th style={num}>Осталось</th>
                              <th style={num}>Сумма по смете</th>
                              <th style={num}>Взято, ₽</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r) => {
                              const qLeft = r.item.qty != null ? r.item.qty - r.takenQty : null;
                              const overRow = r.takenKop > r.item.sumKop || (qLeft != null && qLeft < 0);
                              return (
                                <tr key={r.item.id} style={{ color: overRow ? RED : undefined }}>
                                  <td style={cell}>
                                    {r.item.name}
                                    {r.item.subsection ? <div style={{ color: "var(--color-text-secondary)" }}>{r.item.subsection}</div> : null}
                                  </td>
                                  <td style={num}>
                                    {qtyFmt(r.item.qty)} {r.item.unit}
                                  </td>
                                  <td style={num}>{r.lines ? qtyFmt(r.takenQty) : ""}</td>
                                  <td style={num}>{qLeft != null ? qtyFmt(qLeft) : ""}</td>
                                  <td style={num}>{formatKop(r.item.sumKop)}</td>
                                  <td style={num}>{r.takenKop ? formatKop(r.takenKop) : ""}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </details>
                  </td>
                  <td style={num}>{formatKop(s.plannedKop)}</td>
                  <td style={num}>{s.takenKop ? formatKop(s.takenKop) : "—"}</td>
                  <td style={{ ...num, color: over ? RED : undefined, fontWeight: over ? 700 : undefined }}>{formatKop(left)}</td>
                  <td style={num}>{s.plannedKop ? `${Math.round((s.takenKop / s.plannedKop) * 100)}%` : ""}</td>
                </tr>,
              ];
            })}
            <tr>
              <td colSpan={5} style={{ ...cell, fontWeight: 700, paddingTop: "1rem" }}>
                Вне сметы
              </td>
            </tr>
            <tr>
              <td style={cell}>
                <details>
                  <summary style={{ cursor: "pointer" }}>Покупки, которых нет в смете ({b.offEstimate.length})</summary>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)", margin: "0.4rem 0" }}>
                    <tbody>
                      {b.offEstimate.map((x, i) => (
                        <tr key={i}>
                          <td style={cell}>{x.date.toLocaleDateString("ru-RU", { timeZone: "UTC" })}</td>
                          <td style={cell}>{x.number ?? ""}</td>
                          <td style={cell}>{x.name}</td>
                          <td style={num}>
                            {qtyFmt(x.qty)} {x.unit ?? ""}
                          </td>
                          <td style={num}>{formatKop(x.sumKop)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ fontSize: "var(--text-sm)" }}>
                    Привязать к смете — на странице <Link href="/admin-panel/remont-akirtava/nakladnye">«Накладные»</Link>.
                  </div>
                </details>
              </td>
              <td style={num}>—</td>
              <td style={num}>{formatKop(b.offEstimateKop)}</td>
              <td style={num}>—</td>
              <td style={num}></td>
            </tr>
            <tr>
              <td style={{ ...cell, fontWeight: 700 }}>Итого</td>
              <td style={{ ...num, fontWeight: 700 }}>{formatKop(b.plannedKop)}</td>
              <td style={{ ...num, fontWeight: 700 }}>{formatKop(b.takenKop)}</td>
              <td style={{ ...num, fontWeight: 700 }}>{formatKop(b.plannedKop - b.takenKop)}</td>
              <td style={num}>{b.plannedKop ? `${Math.round((b.takenKop / b.plannedKop) * 100)}%` : ""}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
