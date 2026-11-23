import type { Metadata } from "next";
import Link from "next/link";

import { formatKop } from "@/lib/money";
import { computeBalance } from "@/lib/repair";

import { RepairNav } from "./RepairNav";

export const metadata: Metadata = {
  title: "Ремонт Акиртава — админ",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const cell: React.CSSProperties = { padding: "0.35rem 0.6rem", borderBottom: "1px solid var(--color-border)" };
const num: React.CSSProperties = { ...cell, textAlign: "right", whiteSpace: "nowrap" };

export default async function RemontAkirtavaPage() {
  const b = await computeBalance();
  const fee = b.sections.find((s) => s.kind === "fee");
  const work = b.sections.filter((s) => s.kind === "work");
  const mat = b.sections.filter((s) => s.kind === "material");
  const sum = (xs: typeof b.sections, f: "plannedKop" | "takenKop") => xs.reduce((s, x) => s + x[f], 0);

  return (
    <div>
      <h1>Ремонт Акиртава</h1>
      <RepairNav active="home" />
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", maxWidth: "48rem" }}>
        Смета Д. Леготкина на окончание ремонта (часть работ уже сделана) — по ней контролируем прораба. Товар из Рубина
        приходит из УНФ сам (накладные на «Прораб Дима Леготкин» с пометкой «Акиртава»), покупки вне Рубина, оплату работ и
        гонорар Дима наговаривает в Telegram-бот. Всё это — и строки журнала учёта.
      </p>
      <table style={{ borderCollapse: "collapse", marginTop: "0.75rem" }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--color-text-secondary)" }}>
            <th style={cell}></th>
            <th style={num}>По смете</th>
            <th style={num}>Потрачено</th>
            <th style={num}>Осталось</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Материалы", sum(mat, "plannedKop"), sum(mat, "takenKop")],
            ["Работы", sum(work, "plannedKop"), sum(work, "takenKop")],
            ["Гонорар прораба", fee?.plannedKop ?? 0, fee?.takenKop ?? 0],
            ["Вне сметы", 0, b.offEstimateKop],
          ].map(([label, p, t]) => (
            <tr key={label as string}>
              <td style={cell}>{label}</td>
              <td style={num}>{p ? formatKop(p as number) : "—"}</td>
              <td style={num}>{formatKop(t as number)}</td>
              <td style={num}>{p ? formatKop((p as number) - (t as number)) : "—"}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...cell, fontWeight: 700 }}>Всего (со сметными накладными 5%)</td>
            <td style={{ ...num, fontWeight: 700 }}>{formatKop(b.plannedKop)}</td>
            <td style={{ ...num, fontWeight: 700 }}>{formatKop(b.takenKop)}</td>
            <td style={{ ...num, fontWeight: 700 }}>{formatKop(b.plannedKop - b.takenKop)}</td>
          </tr>
        </tbody>
      </table>
      <p style={{ marginTop: "0.75rem" }}>
        Накладных и расходов: {b.docsCount}. Подробно — <Link href="/admin-panel/remont-akirtava/balans">баланс по разделам сметы</Link> и{" "}
        <Link href="/admin-panel/remont-akirtava/nakladnye">список накладных</Link>.
      </p>
    </div>
  );
}
