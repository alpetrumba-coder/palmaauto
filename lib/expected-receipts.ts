/**
 * «Ожидаем поступлений»: какие деньги, по какой брони, когда и куда должны прийти.
 * Правила площадок — из протокола перехода 10.11:
 *  - Авито «К» (в RC «Корзина») и сайт («Модуль бронирования»): предоплата из RC приходит на Карту Х в день заезда, остальное — с гостя при заезде;
 *  - Ostrovok, оплачено полностью в RC: площадка удерживает комиссию, остаток приходит на Карту Х в день заезда;
 *  - Суточно, ПриветТур, Ostrovok с частичной предоплатой: предоплата — комиссия площадки, к нам не приходит; остальное — с гостя при заезде;
 *  - прямые брони и аренда машин: всё, что не оплачено, — с гостя.
 * Заезды до начала учёта не показываем: деньги за них уже в начальных остатках.
 * Долгосрочные (от 28 ночей) — помесячным графиком (lib/deal-schedule.ts): месяцы до начала учёта не ждём,
 * остальные — отдельными строками на первый день месяца.
 * Ожидаемое = сумма брони − комиссия площадки − уже полученное в кассы.
 */
import { getAccountingStartDate, getDealTotals } from "@/lib/accounting";
import { buildSchedule, isDepositComment, isLongStay, periodLabel } from "@/lib/deal-schedule";
import { prisma } from "@/lib/prisma";

/** Источник брони в RC из комментария «Из RealtyCalendar №… (Корзина)». */
export const rcSourceOf = (comment: string | null): string | null => comment?.match(/Из RealtyCalendar №\d+ \(([^)]+)\)/)?.[1] ?? null;

export type ExpectedReceipt = {
  dealId: string;
  number: number;
  assetName: string;
  guestName: string;
  /** День, когда ждём деньги (день заезда), YYYY-MM-DD. */
  date: string;
  amountKop: number;
  how: "platform" | "guest";
  /** Пояснение: откуда и куда. */
  note: string;
  /** Платёж по графику долгосрочной брони. */
  installment?: { index: number; count: number; period: string };
};

const DAY = 86400000;

export async function getExpectedReceipts(today: Date): Promise<ExpectedReceipt[]> {
  // заезды до начала учёта не ждём: деньги за них уже в начальных остатках касс
  const start = await getAccountingStartDate();
  const deals = await prisma.deal.findMany({
    where: {
      status: "ACTIVE",
      rcMissingSince: null,
      endDate: { gte: new Date(today.getTime() - 30 * DAY) },
    },
    select: {
      id: true, number: true, guestName: true, startDate: true, grossKop: true, commissionKop: true, rcPaidKop: true, comment: true, monthlyKop: true, endDate: true,
      asset: { select: { name: true, kind: true } }, channel: { select: { name: true } },
    },
    orderBy: { startDate: "asc" },
  });
  const startDay = start ? new Date(`${start}T00:00:00Z`) : null;
  const totals = await getDealTotals(deals.map((d) => d.id));
  // депозиты долгосрочных броней засчитываются в последний месяц
  const longIds = deals.filter((d) => isLongStay(d.startDate, d.endDate)).map((d) => d.id);
  const depositOps = longIds.length
    ? await prisma.operation.findMany({ where: { dealId: { in: longIds }, type: "INCOME", voidedAt: null }, select: { dealId: true, amountKop: true, comment: true } })
    : [];
  const deposit = new Map<string, number>();
  for (const o of depositOps) if (o.dealId && isDepositComment(o.comment)) deposit.set(o.dealId, (deposit.get(o.dealId) ?? 0) + o.amountKop);

  const schedule = (d: (typeof deals)[number], paid: number, left: number) => {
    const dep = Math.min(deposit.get(d.id) ?? 0, paid);
    return buildSchedule({
      startDate: d.startDate,
      endDate: d.endDate,
      netKop: d.grossKop - d.commissionKop,
      monthlyKop: d.monthlyKop,
      paidFrontKop: d.grossKop - d.commissionKop - left - dep, // полученное + ожидаемая предоплата площадки
      paidBackKop: dep,
    });
  };

  const out: ExpectedReceipt[] = [];
  for (const d of deals) {
    const long = isLongStay(d.startDate, d.endDate);
    // заезд до начала учёта: деньги в начальных остатках; у долгосрочных ждём месяцы после начала
    if (startDay && d.startDate < startDay && !long) continue;
    const paid = totals.get(d.id)?.paidKop ?? 0;
    let left = d.grossKop - d.commissionKop - paid;
    if (left <= 0) continue;
    const src = (rcSourceOf(d.comment) ?? "").toLowerCase();
    const ch = (d.channel?.name ?? "").toLowerCase();
    const rcPaid = d.rcPaidKop ?? 0;
    const base = { dealId: d.id, number: d.number, assetName: d.asset.name, guestName: d.guestName, date: d.startDate.toISOString().slice(0, 10) };

    const beforeStart = !!startDay && d.startDate < startDay; // заехали до начала учёта: предоплата уже в остатках
    if (beforeStart) {
      // ничего не ждём от площадки — только помесячные платежи ниже
    } else if ((src === "корзина" || src.includes("модуль")) && rcPaid > 0) {
      const viaPlatform = Math.min(rcPaid, left);
      out.push({ ...base, amountKop: viaPlatform, how: "platform", note: `предоплата через ${src === "корзина" ? "Авито" : "сайт"} → Карта Х в день заезда` });
      left -= viaPlatform;
    } else if ((src.includes("ostrovok") || ch.includes("островок")) && rcPaid >= d.grossKop && d.grossKop > 0) {
      out.push({ ...base, amountKop: left, how: "platform", note: "от Ostrovok за вычетом комиссии → Карта Х в день заезда" });
      left = 0;
    }
    if (left <= 0) continue;
    const plan = long ? schedule(d, paid, left) : [];
    if (plan.length) {
      for (const it of plan) {
        if (it.leftKop <= 0) continue;
        if (start && it.from < start) continue; // месяцы до начала учёта — в начальных остатках
        out.push({
          ...base,
          date: it.from,
          amountKop: it.leftKop,
          how: "guest",
          note: `за ${periodLabel(it)} — платёж ${it.index} из ${plan.length}`,
          installment: { index: it.index, count: plan.length, period: periodLabel(it) },
        });
      }
      continue;
    }
    if (beforeStart) continue;
    out.push({ ...base, amountKop: left, how: "guest", note: d.asset.kind === "CAR" ? "с клиента за аренду" : "с гостя при заезде" });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.number - b.number);
}
