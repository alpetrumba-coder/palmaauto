import type { Metadata } from "next";
import Link from "next/link";

import { OperationRowActions } from "@/components/admin/OperationRowActions";
import { getAccountBalances, OPERATION_TYPE_LABEL } from "@/lib/accounting";
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

  const [balances, rows, totals, accounts, assets] = await Promise.all([
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
      <h1 style={{ fontSize: "var(--text-2xl)", margin: 0 }}>Учёт</h1>

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", margin: "1rem 0 1.5rem" }}>
        <Link href="/admin-panel/accounting/new?type=INCOME" style={{ ...bigBtn, background: "var(--color-accent)", color: "#fff" }}>
          + Приход
        </Link>
        <Link href="/admin-panel/accounting/new?type=EXPENSE" style={{ ...bigBtn, background: "var(--color-accent)", color: "#fff" }}>
          + Расход
        </Link>
        <Link href="/admin-panel/accounting/new?type=HANDOVER" style={{ ...bigBtn, border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
          Сдано в Рубин
        </Link>
        <Link href="/admin-panel/accounting/new?type=TRANSFER" style={{ ...bigBtn, border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
          Перемещение
        </Link>
        <Link href="/admin-panel/accounting/deals/new" style={{ ...bigBtn, border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
          + Заезд / аренда
        </Link>
        <Link href="/admin-panel/accounting/deals" style={{ ...bigBtn, border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
          Все заезды и аренды
        </Link>
        <Link href="/admin-panel/accounting/reports" style={{ ...bigBtn, border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
          Отчёты
        </Link>
        <Link href="/admin-panel/accounting/rc" style={{ ...bigBtn, border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
          Сверка с RealtyCalendar
        </Link>
        {session.role === "OWNER" ? (
          <Link href="/admin-panel/accounting/import" style={{ ...bigBtn, border: "1px dashed var(--color-border)", color: "var(--color-text-secondary)", fontWeight: 600 }}>
            Импорт истории
          </Link>
        ) : null}
      </div>

      <h2 style={{ fontSize: "var(--text-lg)", margin: "0 0 0.6rem" }}>Остатки по кассам</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(13rem, 1fr))", gap: "0.6rem" }}>
        {activeBalances.map((b) => (
          <Link
            key={b.id}
            href={`/admin-panel/accounting?account=${b.id}`}
            style={{ padding: "0.7rem 0.85rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", background: "var(--color-surface)", textDecoration: "none", color: "var(--color-text)", opacity: b.active ? 1 : 0.6 }}
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
        Всего в кассах: <strong style={{ color: "var(--color-text)" }}>{formatKop(totalKop)}</strong>. Сдачи в Рубин и перенесённая из старой истории (метка «импорт») в остаток не входят: остатки задаются вручную.
      </p>

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
                    <td style={cell}>
                      {o.deal ? (
                        <Link href={`/admin-panel/accounting/deals/${o.deal.id}`}>
                          №{o.deal.number} {o.deal.guestName}
                        </Link>
                      ) : (
                        (o.asset?.name ?? "—")
                      )}
                    </td>
                    <td style={{ ...cell, maxWidth: "18rem" }}>
                      {o.comment ?? ""}
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
