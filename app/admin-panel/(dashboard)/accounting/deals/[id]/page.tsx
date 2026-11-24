import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { setDealMonthlyAction } from "@/app/actions/deals";
import { DealCancelButton } from "@/components/admin/DealCancelButton";
import { OperationRowActions } from "@/components/admin/OperationRowActions";
import { OPERATION_TYPE_LABEL, REFUND_CATEGORY } from "@/lib/accounting";
import { fmtDate } from "@/lib/accounting-options";
import { buildSchedule, isDepositComment, isLongStay, periodLabel } from "@/lib/deal-schedule";
import { formatKop, kopToInput } from "@/lib/money";
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
      changes: { orderBy: { at: "desc" }, take: 30 },
      operations: {
        include: { account: { select: { name: true } }, category: { select: { name: true } } },
        orderBy: [{ date: "asc" }, { number: "asc" }],
      },
    },
  });
  if (!deal) notFound();

  const live = deal.operations.filter((o) => !o.voidedAt);
  // возврат клиенту — не расход: уменьшает «оплачено»
  const isRefund = (o: (typeof live)[number]) => o.type === "EXPENSE" && o.category?.name === REFUND_CATEGORY;
  const refundKop = live.filter(isRefund).reduce((s, o) => s + o.amountKop, 0);
  const paidKop = live.filter((o) => o.type === "INCOME").reduce((s, o) => s + o.amountKop, 0) - refundKop;
  const expenseKop = live.filter((o) => o.type === "EXPENSE" && !isRefund(o)).reduce((s, o) => s + o.amountKop, 0);
  const netKop = deal.grossKop - deal.commissionKop;
  const leftKop = deal.grossKop - paidKop;
  const isCar = deal.asset.kind === "CAR";
  const cancelled = deal.status === "CANCELLED";
  const share = netKop > 0 ? expenseKop / netKop : 0;
  const target = targetExpenseShare(deal.startDate);
  const nights = inclusiveRentalDays(deal.startDate, deal.endDate);
  const longStay = !isCar && isLongStay(deal.startDate, deal.endDate);
  const depositKop = Math.min(paidKop, live.filter((o) => o.type === "INCOME" && isDepositComment(o.comment)).reduce((s, o) => s + o.amountKop, 0));
  const schedule = longStay
    ? buildSchedule({ startDate: deal.startDate, endDate: deal.endDate, netKop, monthlyKop: deal.monthlyKop, paidFrontKop: paidKop - depositKop, paidBackKop: depositKop })
    : [];
  const todayIso = new Date().toISOString().slice(0, 10);

  const stat = (label: string, value: string, strong = false, color?: string) => (
    <div style={{ padding: "0.65rem 0.85rem", borderRadius: "var(--radius-md)", background: "var(--color-surface)" }}>
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
          {deal.siteBookingId ? (
            <Link href={`/admin-panel/orders/${deal.siteBookingId}/edit`} style={{ fontWeight: 600 }} title="Даты, сумма и отмена меняются в самой брони — карточка обновится сама">
              Изменить бронь на сайте
            </Link>
          ) : (
            <>
              <Link href={`/admin-panel/accounting/deals/${deal.id}/edit`} style={{ fontWeight: 600 }}>Изменить</Link>
              <DealCancelButton id={deal.id} number={deal.number} />
            </>
          )}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))", gap: "0.6rem", marginBottom: "1rem" }}>
        {stat("Сумма гостя", formatKop(deal.grossKop))}
        {stat("Комиссия площадки", formatKop(deal.commissionKop))}
        {stat("Нетто", formatKop(netKop))}
        {deal.rcPaidKop !== null ? stat("Оплачено по RC (отметка, не деньги)", formatKop(deal.rcPaidKop)) : null}
        {stat(refundKop ? `Получено в кассы (за вычетом возвратов ${formatKop(refundKop)})` : "Получено в кассы", formatKop(paidKop), true)}
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

      {deal.rcBookingId ? (
        <p style={{ margin: "0 0 1rem", fontSize: "var(--text-sm)", color: deal.rcMissingSince ? "var(--color-danger, #b00020)" : "var(--color-text-secondary)" }}>
          RealtyCalendar №{deal.rcBookingId}
          {deal.rcMissingSince ? " · брони там больше нет, проверьте, не отменена ли она" : " · данные брони подтягиваются из RealtyCalendar при ежедневной сверке"}
        </p>
      ) : null}
      {deal.siteBookingId ? (
        <p style={{ margin: "0 0 1rem", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          Бронь машины на сайте · даты, сумма и отмена подтягиваются из неё автоматически, онлайн-оплата записывается в «Монету» сама.
        </p>
      ) : null}

      {schedule.length ? (
        <>
          <h2 style={{ fontSize: "var(--text-lg)", margin: "1.5rem 0 0.5rem" }}>График оплат по месяцам</h2>
          <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", maxWidth: "52rem" }}>
            Месяцы считаются от дня заезда, платёж ждём в первый день месяца — в этот день бот напоминает сотрудникам. Полученное засчитывается с первого месяца,
            депозит (в комментарии оплаты «депозит» или «аванс за последний месяц») — в последний.
            {depositKop ? ` Депозит: ${formatKop(depositKop)}.` : ""}
          </p>
          {!cancelled ? (
            <form action={setDealMonthlyAction.bind(null, deal.id)} style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", margin: "0 0 0.6rem", fontSize: "var(--text-sm)" }}>
              <label htmlFor="monthly">Платёж в месяц, ₽:</label>
              <input id="monthly" name="monthly" defaultValue={deal.monthlyKop ? kopToInput(deal.monthlyKop) : ""} placeholder="поровну" inputMode="decimal" style={{ width: "8rem", padding: "0.35rem 0.5rem" }} />
              <button type="submit" style={{ padding: "0.35rem 0.8rem", cursor: "pointer" }}>Сохранить</button>
              <span style={{ color: "var(--color-text-secondary)" }}>пусто — полные месяцы поровну, последний неполный — по ночам</span>
            </form>
          ) : null}
          <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
            <table style={{ borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
              <thead>
                <tr style={{ background: "var(--color-surface)", textAlign: "left" }}>
                  {["№", "Месяц", "Ночей", "Сумма", "Получено", "Статус"].map((h) => (
                    <th key={h} style={{ ...cell, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedule.map((it) => {
                  const late = it.leftKop > 0 && it.from < todayIso;
                  return (
                    <tr key={it.index} style={{ color: late && !cancelled ? "var(--color-danger, #b00020)" : undefined }}>
                      <td style={cell}>{it.index}</td>
                      <td style={{ ...cell, whiteSpace: "nowrap" }}>{periodLabel(it)}</td>
                      <td style={cell}>{it.nights}</td>
                      <td style={{ ...cell, whiteSpace: "nowrap" }}>{formatKop(it.amountKop)}</td>
                      <td style={{ ...cell, whiteSpace: "nowrap" }}>{formatKop(it.paidKop)}</td>
                      <td style={cell}>
                        {it.leftKop <= 0 ? "оплачено" : late ? `просрочено, ждём ${formatKop(it.leftKop)}` : `ждём ${formatKop(it.leftKop)} ${fmtDate(new Date(`${it.from}T00:00:00Z`))}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

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
      {deal.changes.length > 0 ? (
        <>
          <h2 style={{ fontSize: "var(--text-lg)", margin: "1.5rem 0 0.5rem" }}>История изменений</h2>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
            {deal.changes.map((c) => (
              <li key={c.id}>
                {c.at.toLocaleString("ru-RU", { timeZone: "Europe/Moscow", dateStyle: "short", timeStyle: "short" })} — {c.text}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}
