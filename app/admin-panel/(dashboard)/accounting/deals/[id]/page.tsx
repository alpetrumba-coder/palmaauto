import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DealCancelButton } from "@/components/admin/DealCancelButton";
import { OperationRowActions } from "@/components/admin/OperationRowActions";
import { OPERATION_TYPE_LABEL } from "@/lib/accounting";
import { fmtDate } from "@/lib/accounting-options";
import { formatKop } from "@/lib/money";
import { inclusiveRentalDays } from "@/lib/rental-dates";
import { targetExpenseShare } from "@/lib/season";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";

export const metadata: Metadata = {
  title: "Заезд / аренда — админ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const cell: React.CSSProperties = { padding: "0.5rem 0.7rem", borderBottom: "1px solid var(--color-border)", verticalAlign: "top" };
const btn: React.CSSProperties = {
  display: "inline-flex",
  padding: "0.65rem 1.1rem",
  borderRadius: "999px",
  background: "var(--color-accent)",
  color: "#fff",
  fontWeight: 700,
  textDecoration: "none",
  fontSize: "var(--text-sm)",
};

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPanelSession();
  const { id } = await params;
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      asset: { select: { name: true, kind: true } },
      channel: { select: { name: true } },
      operations: {
        include: { account: { select: { name: true } }, category: { select: { name: true } } },
        orderBy: [{ date: "asc" }, { number: "asc" }],
      },
    },
  });
  if (!deal) notFound();

  const live = deal.operations.filter((o) => !o.voidedAt);
  const paidKop = live.filter((o) => o.type === "INCOME").reduce((s, o) => s + o.amountKop, 0);
  const expenseKop = live.filter((o) => o.type === "EXPENSE").reduce((s, o) => s + o.amountKop, 0);
  const netKop = deal.grossKop - deal.commissionKop;
  const leftKop = deal.grossKop - paidKop;
  const isCar = deal.asset.kind === "CAR";
  const cancelled = deal.status === "CANCELLED";
  const share = netKop > 0 ? expenseKop / netKop : 0;
  const target = targetExpenseShare(deal.startDate);
  const nights = inclusiveRentalDays(deal.startDate, deal.endDate);

  const stat = (label: string, value: string, strong = false, color?: string) => (
    <div style={{ padding: "0.6rem 0.8rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", background: "var(--color-surface)" }}>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{label}</div>
      <div style={{ fontSize: "var(--text-lg)", fontWeight: strong ? 700 : 600, color }}>{value}</div>
    </div>
  );

  return (
    <>
      <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)" }}>
        <Link href="/admin-panel/accounting/deals">← Все заезды и аренды</Link>
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)", margin: 0 }}>
        {isCar ? "Аренда" : "Заезд"} №{deal.number} · {deal.asset.name}
        {cancelled ? " · отменён" : ""}
      </h1>
      <p style={{ margin: "0.5rem 0 1rem" }}>
        {deal.guestName}
        {deal.phone ? ` · ${deal.phone}` : ""} · {fmtDate(deal.startDate)} – {fmtDate(deal.endDate)} ({nights} {isCar ? "сут." : "ноч."}) ·{" "}
        {deal.channel?.name ?? "напрямую"}
        {deal.comment ? <span style={{ color: "var(--color-text-secondary)" }}> · {deal.comment}</span> : null}
      </p>

      {!cancelled ? (
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1.25rem" }}>
          <Link href={`/admin-panel/accounting/new?type=INCOME&deal=${deal.id}`} style={btn}>+ Оплата</Link>
          <Link href={`/admin-panel/accounting/new?type=EXPENSE&deal=${deal.id}`} style={btn}>+ Расход</Link>
          <Link href={`/admin-panel/accounting/deals/${deal.id}/edit`} style={{ fontWeight: 600 }}>Изменить</Link>
          <DealCancelButton id={deal.id} number={deal.number} />
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))", gap: "0.6rem" }}>
        {stat("Сумма гостя", formatKop(deal.grossKop))}
        {stat("Комиссия площадки", formatKop(deal.commissionKop))}
        {stat("Нетто", formatKop(netKop))}
        {stat("Оплачено", formatKop(paidKop), true)}
        {stat("Осталось доплатить", formatKop(leftKop), true, leftKop > 0 && !cancelled ? "var(--color-danger, #b00020)" : undefined)}
        {stat("Расходы по заезду", formatKop(expenseKop))}
        {stat("Остаётся (нетто − расходы)", formatKop(netKop - expenseKop), true)}
        {stat(
          "Расходы от нетто",
          `${Math.round(share * 100)}% (цель ≤ ${Math.round(target * 100)}%)`,
          false,
          share > target ? "var(--color-danger, #b00020)" : "var(--color-success, #1a7f37)",
        )}
      </div>

      <h2 style={{ fontSize: "var(--text-lg)", margin: "1.5rem 0 0.5rem" }}>Оплаты и расходы</h2>
      {deal.operations.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)" }}>Пока нет операций. Нажмите «+ Оплата», когда придут деньги.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
            <thead>
              <tr style={{ background: "var(--color-surface)", textAlign: "left" }}>
                {["№", "Дата", "Вид", "Сумма", "Касса", "Статья", "Комментарий", "Кто", ""].map((h) => (
                  <th key={h} style={{ ...cell, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deal.operations.map((o) => {
                const voided = !!o.voidedAt;
                return (
                  <tr key={o.id} style={{ opacity: voided ? 0.5 : 1, textDecoration: voided ? "line-through" : undefined }}>
                    <td style={cell}>{o.number}</td>
                    <td style={{ ...cell, whiteSpace: "nowrap" }}>{fmtDate(o.date)}</td>
                    <td style={cell}>{OPERATION_TYPE_LABEL[o.type]}</td>
                    <td style={{ ...cell, whiteSpace: "nowrap", fontWeight: 600, color: o.type === "INCOME" ? "var(--color-success, #1a7f37)" : undefined }}>
                      {o.type === "INCOME" ? "+" : "−"}
                      {formatKop(o.amountKop)}
                    </td>
                    <td style={cell}>{o.account.name}</td>
                    <td style={cell}>{o.category?.name ?? "—"}</td>
                    <td style={{ ...cell, maxWidth: "16rem" }}>{o.comment ?? ""}</td>
                    <td style={{ ...cell, whiteSpace: "nowrap", color: "var(--color-text-secondary)" }}>{o.createdBy}</td>
                    <td style={cell}>{voided ? null : <OperationRowActions id={o.id} number={o.number} />}</td>
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
