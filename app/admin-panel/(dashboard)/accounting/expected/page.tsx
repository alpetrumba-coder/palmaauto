import type { Metadata } from "next";
import Link from "next/link";

import { fmtDate } from "@/lib/accounting-options";
import { getExpectedReceipts } from "@/lib/expected-receipts";
import { formatKop } from "@/lib/money";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";
import { utcToday } from "@/lib/rental-dates";

export const metadata: Metadata = {
  title: "Ожидаем поступлений — админ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const cell: React.CSSProperties = { padding: "0.45rem 0.6rem", borderBottom: "1px solid var(--color-border)", verticalAlign: "top", textAlign: "left" };

export default async function ExpectedReceiptsPage() {
  await requireAdminPanelSession();
  const today = utcToday();
  const todayIso = today.toISOString().slice(0, 10);
  const rows = await getExpectedReceipts(today);
  const sum = (how: "platform" | "guest") => rows.filter((r) => r.how === how).reduce((s, r) => s + r.amountKop, 0);
  const overdue = rows.filter((r) => r.date < todayIso);
  const in30Iso = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  const next30 = rows.filter((r) => r.date <= in30Iso).reduce((s, r) => s + r.amountKop, 0);
  // долгосрочные: показываем просроченные и ближайший платёж, остальные месяцы — свёрнуто под ним
  const shownInst = new Set<string>();
  const later = new Map<string, typeof rows>();
  const visible = rows.filter((r) => {
    if (!r.installment) return true;
    if (r.date <= todayIso) return true;
    if (!shownInst.has(r.dealId)) {
      shownInst.add(r.dealId);
      return true;
    }
    later.set(r.dealId, [...(later.get(r.dealId) ?? []), r]);
    return false;
  });

  return (
    <>
      <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)" }}>
        <Link href="/admin-panel/accounting">← К остаткам и журналу</Link>
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.5rem" }}>Ожидаем поступлений</h1>
      <p style={{ margin: "0 0 0.4rem", fontSize: "var(--text-sm)", maxWidth: "52rem" }}>
        Через площадки на Карту Х: <strong>{formatKop(sum("platform"))}</strong> · с гостей: <strong>{formatKop(sum("guest"))}</strong> · всего в ближайшие 30 дней: <strong>{formatKop(next30)}</strong>.
        {overdue.length ? <span style={{ color: "var(--color-danger, #b00020)" }}> Заезд уже был, а денег нет: {overdue.length} — проверьте и внесите.</span> : null}
      </p>
      <p style={{ margin: "0 0 1rem", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", maxWidth: "52rem" }}>
        Ожидаемое = сумма брони − комиссия площадки − уже полученное в кассы. Предоплата из RealtyCalendar здесь — не деньги в кассах: когда деньги придут, их вносят приходом (бот или «+ Приход»), и строка исчезнет.
        Правила площадок — на странице «Ввод первоначальных остатков». Долгосрочные брони (от 28 ночей) — по месяцам от дня заезда: виден ближайший платёж, остальные — под ним; в день платежа бот напоминает сотрудникам.
      </p>
      {rows.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)" }}>Ничего не ждём.</p>
      ) : (
        <div style={{ overflowX: "auto", background: "var(--color-surface)", borderRadius: "var(--radius-md)" }}>
          <table style={{ width: "100%", minWidth: "48rem", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ color: "var(--color-text-secondary)" }}>
                {["Дата", "Бронь", "Объект", "Гость", "Сумма", "Откуда и куда"].map((h) => (
                  <th key={h} style={{ ...cell, fontWeight: 600, fontSize: "12px", textAlign: h === "Сумма" ? "right" : "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => (
                <tr key={`${r.dealId}-${i}`} style={{ color: r.date < todayIso ? "var(--color-danger, #b00020)" : undefined }}>
                  <td style={{ ...cell, whiteSpace: "nowrap" }}>{fmtDate(new Date(`${r.date}T00:00:00Z`))}</td>
                  <td style={cell}>
                    <Link href={`/admin-panel/accounting/deals/${r.dealId}`}>№{r.number}</Link>
                  </td>
                  <td style={cell}>{r.assetName}</td>
                  <td style={cell}>{r.guestName}</td>
                  <td style={{ ...cell, textAlign: "right", whiteSpace: "nowrap", fontWeight: 600 }}>{formatKop(r.amountKop)}</td>
                  <td style={cell}>
                    {r.note}
                    {r.installment && r.date > todayIso && later.get(r.dealId)?.length ? (
                      <details style={{ marginTop: "0.25rem", color: "var(--color-text-secondary)" }}>
                        <summary style={{ cursor: "pointer" }}>
                          дальше ещё {later.get(r.dealId)!.length} плат. на {formatKop(later.get(r.dealId)!.reduce((s, x) => s + x.amountKop, 0))}
                        </summary>
                        {later.get(r.dealId)!.map((x) => (
                          <div key={x.date}>
                            {fmtDate(new Date(`${x.date}T00:00:00Z`))} — {formatKop(x.amountKop)} за {x.installment?.period}
                          </div>
                        ))}
                      </details>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
