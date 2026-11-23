import type { Metadata } from "next";
import Link from "next/link";

import { formatKop } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { DEST_LABEL, ensureRepairSeed, KIND_LABEL, loadEstimate, REPAIR_PROJECT } from "@/lib/repair";

import { RepairNav } from "../RepairNav";
import { DestinationButtons, LineEstimateSelect, type EstimateOption } from "./RepairControls";

export const metadata: Metadata = {
  title: "Накладные — ремонт Акиртава",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const cell: React.CSSProperties = { padding: "0.3rem 0.5rem", borderBottom: "1px solid var(--color-border)", verticalAlign: "top" };
const num: React.CSSProperties = { ...cell, textAlign: "right", whiteSpace: "nowrap" };
const SOURCE_LABEL: Record<string, string> = { unf: "из УНФ (Рубин)", bot: "из Telegram", site: "вручную" };
const MATCH_LABEL: Record<string, string> = { article: "по артикулу", name: "по названию — проверьте", manual: "выбрано вручную", fee: "гонорар", none: "" };

const TABS = [
  { key: "akirtava", label: "Акиртава" },
  { key: "unknown", label: "Без пометки" },
  { key: "palma", label: "Пальма (из Рубина)" },
];

export default async function RepairDocsPage({ searchParams }: { searchParams: Promise<{ dest?: string }> }) {
  const sp = await searchParams;
  const dest = TABS.some((t) => t.key === sp.dest) ? (sp.dest as string) : "akirtava";
  await ensureRepairSeed();
  const [items, docs, counts] = await Promise.all([
    loadEstimate(),
    prisma.repairDoc.findMany({
      where: { project: REPAIR_PROJECT, destination: dest, voidedAt: null },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { lines: { orderBy: { lineNo: "asc" } }, files: { select: { id: true, name: true } } },
      take: 200,
    }),
    prisma.repairDoc.groupBy({ by: ["destination"], where: { project: REPAIR_PROJECT, voidedAt: null }, _count: true }),
  ]);
  const opIds = docs.map((d) => d.operationId).filter((x): x is string => !!x);
  const ops = await prisma.operation.findMany({ where: { id: { in: opIds } }, select: { id: true, number: true, voidedAt: true, account: { select: { name: true } } } });
  const opById = new Map(ops.map((o) => [o.id, o]));
  const options: EstimateOption[] = items
    .filter((i) => i.kind !== "overhead")
    .map((i) => ({ id: i.id, group: `${i.kind === "work" ? "Работы" : i.kind === "fee" ? "Гонорар" : "Материалы"} · ${i.section}`, label: `${i.name.slice(0, 70)} (${i.qty ?? ""} ${i.unit})` }));
  const cnt = (k: string) => counts.find((c) => c.destination === k)?._count ?? 0;

  return (
    <div>
      <h1>Ремонт Акиртава</h1>
      <RepairNav active="docs" />
      <nav style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <Link key={t.key} href={`?dest=${t.key}`} style={{ fontWeight: t.key === dest ? 700 : 400 }}>
            {t.label} ({cnt(t.key)})
          </Link>
        ))}
      </nav>
      {dest === "unknown" ? (
        <p style={{ color: "#c0392b" }}>Накладные из Рубина без пометки «Акиртава»/«Пальма» в комментарии УНФ — укажите, для чего товар.</p>
      ) : null}
      {docs.length === 0 ? <p>Пока ничего нет.</p> : null}
      {docs.map((d) => {
        const op = d.operationId ? opById.get(d.operationId) : undefined;
        return (
          <section key={d.id} style={{ border: "1px solid var(--color-border)", borderRadius: "0.75rem", padding: "0.75rem 1rem", marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <strong>
                  {d.date.toLocaleDateString("ru-RU", { timeZone: "UTC" })} · {KIND_LABEL[d.kind] ?? d.kind}
                  {d.number ? ` № ${d.number}` : ""}
                </strong>
                <div style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
                  {[d.supplier, SOURCE_LABEL[d.source] ?? d.source, op ? `журнал №${op.number}${op.voidedAt ? " (аннулирована)" : ""} · ${op.account.name}` : "без строки журнала", `внёс: ${d.createdBy}`]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {d.comment ? <div style={{ fontSize: "var(--text-sm)" }}>{d.comment}</div> : null}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700 }}>{d.kind === "return" ? "−" : ""}{formatKop(d.totalKop)}</div>
                <div style={{ fontSize: "var(--text-sm)" }}>{DEST_LABEL[d.destination] ?? d.destination}</div>
              </div>
            </div>
            {d.source === "unf" && d.kind !== "return" ? (
              <div style={{ margin: "0.4rem 0" }}>
                <DestinationButtons docId={d.id} current={d.destination} />
              </div>
            ) : null}
            {d.files.length ? (
              <div style={{ margin: "0.4rem 0", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {d.files.map((f) => (
                  <a key={f.id} href={`/admin-panel/remont-akirtava/foto/${f.id}`} target="_blank" rel="noopener">
                    📎 {f.name}
                  </a>
                ))}
              </div>
            ) : null}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--color-text-secondary)" }}>
                    <th style={cell}>Наименование</th>
                    <th style={num}>Кол-во</th>
                    <th style={num}>Сумма</th>
                    {d.destination === "akirtava" ? <th style={cell}>Строка сметы</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {d.lines.map((l) => (
                    <tr key={l.id}>
                      <td style={cell}>{l.name}</td>
                      <td style={num}>
                        {l.qty ?? ""} {l.unit ?? ""}
                      </td>
                      <td style={num}>{formatKop(l.sumKop)}</td>
                      {d.destination === "akirtava" ? (
                        <td style={cell}>
                          <LineEstimateSelect lineId={l.id} value={l.estimateItemId ?? ""} options={options} />
                          {l.estimateItemId && MATCH_LABEL[l.matchMode] ? (
                            <div style={{ color: l.matchMode === "name" ? "#b9770e" : "var(--color-text-secondary)" }}>{MATCH_LABEL[l.matchMode]}</div>
                          ) : null}
                          {!l.estimateItemId ? <div style={{ color: "#c0392b" }}>вне сметы</div> : null}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
