import type { Metadata } from "next";
import Link from "next/link";

import { AccountingStartForm } from "@/components/admin/AccountingStartForm";
import { OperationRowActions } from "@/components/admin/OperationRowActions";
import { getAccountBalances, getAccountingStartDate, OPERATION_TYPE_LABEL } from "@/lib/accounting";
import { fmtDate } from "@/lib/accounting-options";
import { formatKop } from "@/lib/money";
import { parseDateInput } from "@/lib/rental-dates";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = {
  title: "Учёт — админ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SP = { from?: string; to?: string; account?: string; type?: string; asset?: string; voided?: string; imp?: string; review?: string };

const cell: React.CSSProperties = { padding: "0.55rem 0.7rem", borderBottom: "1px solid var(--color-border)", verticalAlign: "top" };
const field: React.CSSProperties = {
  padding: "0.45rem 0.55rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
  font: "inherit",
};
const bigBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.75rem 1.2rem",
  borderRadius: "999px",
  fontWeight: 700,
  textDecoration: "none",
  fontSize: "var(--text-base)",
};

const PRIMARY = [
  { href: "/admin-panel/accounting/new?type=INCOME", label: "+ Приход", hint: "Деньги пришли: оплата от гостя, аренда авто и т.п." },
  { href: "/admin-panel/accounting/new?type=EXPENSE", label: "+ Расход", hint: "Деньги ушли: уборка, стирка, закупка, коммуналка." },
  { href: "/admin-panel/accounting/new?type=TRANSFER", label: "+ Перемещение", hint: "Деньги переехали из кассы в кассу (сдали в Рубин, перевели с карты на карту)." },
];

const NAV_GROUPS: { title: string; ownerOnly?: boolean; items: { href: string; label: string; hint: string }[] }[] = [
  {
    title: "Брони",
    items: [
      { href: "/admin-panel/bookings?tab=apts", label: "Шахматка", hint: "Занятость квартир и машин, новые брони" },
      { href: "/admin-panel/accounting/deals", label: "Заезды и аренды", hint: "Все брони с номерами: оплачено, осталось, расходы" },
      { href: "/admin-panel/accounting/rc", label: "Сверка RC и PA", hint: "Все ли брони RealtyCalendar и сайта заведены" },
      { href: "/admin-panel/accounting/laundry", label: "Стирка: распределить", hint: "Одна сумма — поровну на заезды без стирки" },
    ],
  },
  {
    title: "Итоги и правила",
    items: [
      { href: "/admin-panel/accounting/reports", label: "Отчёты", hint: "Прибыль по объектам, собственники, кассы, премии" },
      { href: "/admin-panel/accounting/rules", label: "Правила учёта", hint: "К чему привязывать расходы, какие статьи" },
      { href: "/admin-panel/accounting/agreements", label: "Договорённости", hint: "Комиссии сотрудников, расчёт с собственником" },
      { href: "/admin-panel/accounting/bot", label: "Инструкция по боту", hint: "Как вносить деньги голосом и текстом в Telegram" },
    ],
  },
  {
    title: "Настройки",
    ownerOnly: true,
    items: [
      { href: "/admin-panel/dictionaries", label: "Справочники", hint: "Объекты, кассы, статьи, каналы продаж" },
      { href: "/admin-panel/accounting/import", label: "Импорт истории", hint: "Разовая загрузка старых данных из Excel" },
    ],
  },
];

export default async function AccountingPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await requireAdminPanelSession();
  const sp = await searchParams;

  const from = sp.from ? parseDateInput(sp.from) : null;
  const to = sp.to ? parseDateInput(sp.to) : null;
  const showVoided = sp.voided === "1";
  const hideImported = sp.imp === "hide";
  const onlyReview = sp.review === "1";
  const type = ["INCOME", "EXPENSE", "TRANSFER", "HANDOVER"].includes(sp.type ?? "") ? (sp.type as Prisma.OperationWhereInput["type"]) : undefined;

  const where: Prisma.OperationWhereInput = {
    ...(showVoided ? {} : { voidedAt: null }),
    ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(sp.account ? { OR: [{ accountId: sp.account }, { toAccountId: sp.account }] } : {}),
    ...(type ? { type } : {}),
    ...(sp.asset ? { assetId: sp.asset } : {}),
    ...(hideImported ? { isImported: false } : {}),
    ...(onlyReview ? { needsReview: true } : {}),
  };

  const [startDate, balances, rows, totals, accounts, assets] = await Promise.all([
    getAccountingStartDate(),
    getAccountBalances(),
    prisma.operation.findMany({
      where,
      include: {
        account: { select: { name: true } },
        toAccount: { select: { name: true } },
        category: { select: { name: true } },
        asset: { select: { name: true } },
        deal: { select: { id: true, number: true, guestName: true } },
      },
      orderBy: [{ date: "desc" }, { number: "desc" }],
      take: 300,
    }),
    prisma.operation.groupBy({
      by: ["type"],
      where: { ...where, voidedAt: null, type: { in: ["INCOME", "EXPENSE"] } },
      _sum: { amountKop: true },
    }),
    prisma.cashAccount.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.asset.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);

  const incomeKop = totals.find((t) => t.type === "INCOME")?._sum.amountKop ?? 0;
  const expenseKop = totals.find((t) => t.type === "EXPENSE")?._sum.amountKop ?? 0;
  const activeBalances = balances.filter((b) => b.active || b.balanceKop !== 0);
  const totalKop = activeBalances.reduce((s, b) => s + b.balanceKop, 0);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem 1rem", flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0.5rem 0 0" }}>Учёт</h1>
        <div className="acc-primary">
          {PRIMARY.map((b) => (
            <Link key={b.href} href={b.href} title={b.hint} style={{ ...bigBtn, background: "var(--color-accent)", color: "#fff" }}>
              {b.label}
            </Link>
          ))}
        </div>
      </div>
      <p style={{ margin: "0.5rem 0 1.5rem", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
        Приход — деньги пришли · Расход — деньги ушли · Перемещение — деньги переехали между своими кассами (не доход и не расход).
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(18rem, 1fr))", gap: "1rem 1.25rem", marginBottom: "2rem" }}>
        {NAV_GROUPS.filter((g) => !g.ownerOnly || session.role === "OWNER").map((g) => (
          <section key={g.title}>
            <h2 style={{ margin: "0 0 0.4rem 0.9rem", fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-text-secondary)" }}>
              {g.title}
            </h2>
            <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              {g.items.map((it, i) => (
                <Link
                  key={it.href}
                  href={it.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.7rem 0.9rem",
                    textDecoration: "none",
                    color: "var(--color-text)",
                    borderTop: i ? "1px solid var(--color-border)" : undefined,
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 600 }}>{it.label}</span>
                    <span style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{it.hint}</span>
                  </span>
                  <span aria-hidden="true" style={{ color: "var(--color-text-secondary)", fontSize: "1.2rem" }}>
                    ›
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <h2 id="balances" style={{ fontSize: "var(--text-lg)", margin: "0 0 0.6rem", scrollMarginTop: "1rem" }}>
        Остатки по кассам
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(13rem, 1fr))", gap: "0.6rem" }}>
        {activeBalances.map((b) => (
          <Link
            key={b.id}
            href={`/admin-panel/accounting?account=${b.id}`}
            title="Показать операции по этой кассе"
            style={{ padding: "0.75rem 0.9rem", borderRadius: "var(--radius-md)", background: "var(--color-surface)", textDecoration: "none", color: "var(--color-text)", opacity: b.active ? 1 : 0.6 }}
          >
            <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
              {b.name}
              {b.responsible ? ` · ${b.responsible}` : ""}
            </div>
            <div style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: b.balanceKop < 0 ? "var(--color-danger, #b00020)" : undefined }}>
              {formatKop(b.balanceKop)}
            </div>
          </Link>
        ))}
      </div>
      <p style={{ margin: "0.6rem 0 0", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
        Всего в кассах: <strong style={{ color: "var(--color-text)" }}>{formatKop(totalKop)}</strong>.{" "}
        {startDate ? `Остатки считаются с ${fmtDate(new Date(`${startDate}T00:00:00Z`))}: начальный остаток на эту дату + операции с неё.` : "Дата начала учёта не задана — в остатки входят все операции."}{" "}
        Перенесённая из старой истории (метка «импорт») в остаток не входит.
      </p>
      {session.role === "OWNER" ? <AccountingStartForm current={startDate} /> : null}

      <h2 style={{ fontSize: "var(--text-lg)", margin: "1.75rem 0 0.6rem" }}>Журнал операций</h2>
      <form method="get" style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "end", marginBottom: "0.9rem", fontSize: "var(--text-sm)" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          С
          <input type="date" name="from" defaultValue={sp.from ?? ""} style={field} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          По
          <input type="date" name="to" defaultValue={sp.to ?? ""} style={field} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          Касса
          <select name="account" defaultValue={sp.account ?? ""} style={field}>
            <option value="">все</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          Вид
          <select name="type" defaultValue={sp.type ?? ""} style={field}>
            <option value="">все</option>
            {Object.entries(OPERATION_TYPE_LABEL).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          Объект
          <select name="asset" defaultValue={sp.asset ?? ""} style={field}>
            <option value="">все</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", gap: "0.35rem", alignItems: "center", paddingBottom: "0.45rem" }}>
          <input type="checkbox" name="voided" value="1" defaultChecked={showVoided} />
          с аннулированными
        </label>
        <label style={{ display: "flex", gap: "0.35rem", alignItems: "center", paddingBottom: "0.45rem" }}>
          <input type="checkbox" name="imp" value="hide" defaultChecked={hideImported} />
          без перенесённой истории
        </label>
        <label style={{ display: "flex", gap: "0.35rem", alignItems: "center", paddingBottom: "0.45rem" }}>
          <input type="checkbox" name="review" value="1" defaultChecked={onlyReview} />
          только «проверить»
        </label>
        <button type="submit" style={{ ...field, cursor: "pointer", fontWeight: 600 }}>Показать</button>
        <Link href="/admin-panel/accounting" style={{ paddingBottom: "0.45rem" }}>Сбросить</Link>
      </form>

      <p style={{ margin: "0 0 0.6rem", fontSize: "var(--text-sm)" }}>
        Приходы: <strong>{formatKop(incomeKop)}</strong> · Расходы: <strong>{formatKop(expenseKop)}</strong> · Разница:{" "}
        <strong>{formatKop(incomeKop - expenseKop)}</strong>
        <span style={{ color: "var(--color-text-secondary)" }}> (за выбранный период и фильтры)</span>
      </p>

      {rows.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)" }}>Операций нет. Нажмите «+ Приход» или «+ Расход».</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
            <thead>
              <tr style={{ background: "var(--color-surface)", textAlign: "left" }}>
                {["№", "Дата", "Вид", "Сумма", "Касса", "Статья", "Объект / заезд", "Комментарий", "Кто", ""].map((h) => (
                  <th key={h} style={{ ...cell, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const voided = !!o.voidedAt;
                const sign = o.type === "INCOME" ? "+" : o.type === "TRANSFER" ? "" : "−";
                return (
                  <tr key={o.id} style={{ opacity: voided ? 0.5 : 1, textDecoration: voided ? "line-through" : undefined }}>
                    <td style={cell}>
                      {o.number}
                      {o.isImported ? <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>импорт</div> : null}
                      {o.needsReview ? (
                        <div title={o.reviewNote ?? ""} style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--color-danger, #b00020)" }}>
                          проверить
                        </div>
                      ) : null}
                    </td>
                    <td style={{ ...cell, whiteSpace: "nowrap" }}>{fmtDate(o.date)}</td>
                    <td style={cell}>{OPERATION_TYPE_LABEL[o.type]}</td>
                    <td style={{ ...cell, whiteSpace: "nowrap", fontWeight: 600, color: o.type === "INCOME" ? "var(--color-success, #1a7f37)" : undefined }}>
                      {sign}
                      {formatKop(o.amountKop)}
                    </td>
                    <td style={cell}>
                      {o.account.name}
                      {o.toAccount ? ` → ${o.toAccount.name}` : ""}
                    </td>
                    <td style={cell}>{o.category?.name ?? (o.type === "HANDOVER" ? "Касса Рубина" : "—")}</td>
                    <td style={{ ...cell, minWidth: "9rem" }}>
                      {o.asset ? o.asset.name : null}
                      {o.deal ? (
                        <div style={{ fontSize: "var(--text-xs)" }}>
                          <Link href={`/admin-panel/accounting/deals/${o.deal.id}`}>
                            №{o.deal.number} {o.deal.guestName}
                          </Link>
                        </div>
                      ) : null}
                      {!o.asset && !o.deal ? (
                        (o.type === "INCOME" || o.type === "EXPENSE") ? <span style={{ color: "var(--color-text-secondary)" }}>общий</span> : "—"
                      ) : null}
                    </td>
                    <td style={{ ...cell, minWidth: "24rem", maxWidth: "40rem", wordBreak: "break-word" }}>
                      {!o.assetId && !o.dealId && (o.type === "INCOME" || o.type === "EXPENSE") ? (
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{o.comment ?? ""}</span>
                      ) : (
                        o.comment ?? ""
                      )}
                      {o.needsReview && o.reviewNote ? (
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-danger, #b00020)" }}>{o.reviewNote}</div>
                      ) : null}
                    </td>
                    <td style={{ ...cell, whiteSpace: "nowrap", color: "var(--color-text-secondary)" }}>
                      {o.createdBy}
                      {voided ? ` · аннулировал ${o.voidedBy ?? ""}` : ""}
                    </td>
                    <td style={cell}>{voided ? null : <OperationRowActions id={o.id} number={o.number} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 300 ? (
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>Показаны последние 300 операций. Сузьте период, чтобы увидеть остальные.</p>
          ) : null}
        </div>
      )}
    </>
  );
}
