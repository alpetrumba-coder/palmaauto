import type { Metadata } from "next";
import Link from "next/link";

import { getAccountingStartDate, getDealTotals } from "@/lib/accounting";
import { fmtDate } from "@/lib/accounting-options";
import { formatKop } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";
import { DEALS, IMPROVEMENTS, OPEN_QUESTIONS, OPENING, PAYMENT_RULES, TRANSITION_DATE } from "@/lib/transition-protocol";

export const metadata: Metadata = {
  title: "Ввод первоначальных остатков — админ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const cell: React.CSSProperties = { padding: "0.5rem 0.6rem", borderBottom: "1px solid var(--color-border)", verticalAlign: "top", textAlign: "left" };
const head: React.CSSProperties = { ...cell, fontWeight: 600, fontSize: "12px", color: "var(--color-text-secondary)" };
const box: React.CSSProperties = { overflowX: "auto", background: "var(--color-surface)", borderRadius: "var(--radius-md)", marginBottom: "1.75rem" };
const h2: React.CSSProperties = { fontSize: "var(--text-lg)", margin: "0 0 0.4rem" };
const lead: React.CSSProperties = { margin: "0 0 0.75rem", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", maxWidth: "52rem" };

function Mark({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span style={{ fontWeight: 600, whiteSpace: "nowrap", color: ok ? "var(--color-success, #1a7f37)" : "var(--color-danger, #b00020)" }}>
      {ok ? "✓ " : "✗ "}
      {text}
    </span>
  );
}

export default async function OpeningBalancesPage() {
  await requireAdminPanelSession();

  const [startDate, accounts, deals] = await Promise.all([
    getAccountingStartDate(),
    prisma.cashAccount.findMany({ select: { id: true, name: true, openingKop: true, active: true } }),
    prisma.deal.findMany({
      where: { OR: [{ number: { in: DEALS.flatMap((d) => (d.number ? [d.number] : [])) } }, { rcBookingId: { in: DEALS.flatMap((d) => (d.rcId ? [d.rcId] : [])) } }] },
      select: { id: true, number: true, status: true, rcBookingId: true, channel: { select: { name: true } } },
    }),
  ]);
  const totals = await getDealTotals(deals.map((d) => d.id));
  const accByName = new Map(accounts.map((a) => [a.name, a]));

  const openingRows = OPENING.map((r) => {
    const newName = r.name.replace(/\s*\(.*\)$/, "");
    const acc = accByName.get(newName) ?? (r.systemName ? accByName.get(r.systemName) : undefined);
    let ok: boolean;
    let now: string;
    if (r.rub === null) {
      const hide = /скрыть/i.test(r.todo);
      ok = hide ? !!acc && !acc.active : !!acc;
      now = acc ? `${acc.active ? "активна" : "скрыта"}${acc.openingKop ? `, ${formatKop(acc.openingKop)}` : ""}` : "кассы нет";
    } else {
      ok = !!acc && acc.name === newName && acc.openingKop === r.rub * 100 && acc.active;
      now = acc ? `${acc.name}: ${formatKop(acc.openingKop)}` : "кассы нет";
    }
    return { ...r, ok, now };
  });
  const totalRub = OPENING.reduce((s, r) => s + (r.rub ?? 0), 0);

  const dealRows = DEALS.map((d) => {
    const deal = deals.find((x) => (d.number ? x.number === d.number : x.rcBookingId === d.rcId));
    const paid = deal ? (totals.get(deal.id)?.paidKop ?? 0) : 0;
    let ok = false;
    let now = "нет на шахматке";
    if (deal) {
      now = `№${deal.number} · ${deal.status === "CANCELLED" ? "отменена" : `оплачено ${formatKop(paid)}`}${deal.channel ? ` · ${deal.channel.name}` : ""}`;
      if (d.expect?.cancelled) ok = deal.status === "CANCELLED";
      else if (d.expect?.paidRub !== undefined) ok = deal.status === "ACTIVE" && paid === d.expect.paidRub * 100;
      else ok = deal.status === "ACTIVE";
    }
    return { ...d, ok, now };
  });
  const done = openingRows.filter((r) => r.ok).length + dealRows.filter((r) => r.ok).length;
  const all = openingRows.length + dealRows.length;

  return (
    <>
      <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)" }}>
        <Link href="/admin-panel/accounting">← К остаткам и журналу</Link>
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.5rem" }}>Ввод первоначальных остатков</h1>
      <p style={{ ...lead, color: "var(--color-text)" }}>
        Новый учёт начат <strong>{fmtDate(new Date(`${TRANSITION_DATE}T00:00:00Z`))}</strong>
        {startDate !== TRANSITION_DATE ? <span style={{ color: "var(--color-danger, #b00020)" }}> (в системе сейчас дата начала {startDate ?? "не задана"})</span> : null}. Все записи до этой даты
        помечены «ТЕСТ до перехода 10.11» и в остатки не входят. Остатки касс считаются так: начальный остаток на 10.11 + операции с 10.11.
      </p>
      <p style={lead}>
        Внесено в систему: <strong style={{ color: "var(--color-text)" }}>{done} из {all}</strong>. Отметка ✓ ставится сама, когда данные в системе совпадают с протоколом.
      </p>

      <h2 style={h2}>Начальные остатки касс на 10.11</h2>
      <p style={lead}>Согласованы 10.11. Всего {formatKop(totalRub * 100)}.</p>
      <div style={box}>
        <table style={{ width: "100%", minWidth: "48rem", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr>
              <th style={head}>Касса</th>
              <th style={{ ...head, textAlign: "right" }}>Остаток на 10.11</th>
              <th style={head}>Что сделать</th>
              <th style={head}>Сейчас в системе</th>
            </tr>
          </thead>
          <tbody>
            {openingRows.map((r) => (
              <tr key={r.name}>
                <td style={{ ...cell, fontWeight: 600 }}>{r.name}</td>
                <td style={{ ...cell, textAlign: "right", whiteSpace: "nowrap" }}>{r.rub === null ? "—" : formatKop(r.rub * 100)}</td>
                <td style={cell}>{r.todo}</td>
                <td style={cell}>
                  <Mark ok={r.ok} text={r.now} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={h2}>Как платят гости — правила по каналам</h2>
      <p style={lead}>По этим правилам разобраны все брони ниже. Так же вносим новые.</p>
      <div style={box}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <tbody>
            {PAYMENT_RULES.map((r) => (
              <tr key={r.channel}>
                <td style={{ ...cell, fontWeight: 600, width: "16rem" }}>{r.channel}</td>
                <td style={cell}>{r.rule}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={h2}>Решения по броням</h2>
      <p style={lead}>Каждая бронь сверена с RealtyCalendar. Верным считается RealtyCalendar. Оплаты, полученные до 10.11, внесены датой до 10.11.</p>
      <div style={box}>
        <table style={{ width: "100%", minWidth: "64rem", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr>
              <th style={head}>Бронь</th>
              <th style={head}>Решение</th>
              <th style={head}>Что сделать</th>
              <th style={head}>Сейчас в системе</th>
            </tr>
          </thead>
          <tbody>
            {dealRows.map((d) => (
              <tr key={`${d.number ?? ""}-${d.rcId ?? ""}`}>
                <td style={{ ...cell, fontWeight: 600 }}>
                  {d.number ? `№${d.number} · ` : ""}
                  {d.title}
                  {d.rcId ? <div style={{ fontWeight: 400, fontSize: "12px", color: "var(--color-text-secondary)" }}>RC №{d.rcId}</div> : null}
                </td>
                <td style={cell}>{d.fact}</td>
                <td style={cell}>{d.todo}</td>
                <td style={cell}>
                  <Mark ok={d.ok} text={d.now} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={h2}>Открытые вопросы</h2>
      <ul style={{ margin: "0 0 1.75rem", paddingLeft: "1.2rem", fontSize: "var(--text-sm)" }}>
        {OPEN_QUESTIONS.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ul>

      <h2 style={h2}>Доработки после перехода</h2>
      <ol style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "var(--text-sm)", maxWidth: "52rem" }}>
        {IMPROVEMENTS.map((i) => (
          <li key={i.title} style={{ marginBottom: "0.4rem" }}>
            <strong>{i.title}.</strong> {i.text}
          </li>
        ))}
      </ol>
    </>
  );
}
