import { Prisma } from "@prisma/client";

import { getDealTotals } from "@/lib/accounting";
import { RcError, rcFetchEvents } from "@/lib/rc-client";
import { reconcile, type OurDeal, type ReconcileResult } from "@/lib/rc-reconcile";
import { prisma } from "@/lib/prisma";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

export type RcRunSummary = ReconcileResult & { fetchedEvents: number; requests: number };

/**
 * Одна сверка: читает брони RealtyCalendar (45 дней назад — 150 вперёд), сравнивает с заездами, сохраняет результат.
 * Единственная запись в данные заездов — связь заезд ↔ бронь (rcBookingId) при ТОЧНОМ совпадении объекта и дат.
 * Всё остальное — только отчёт: решает человек.
 */
export async function runRcSync(trigger: "cron" | "manual", startedBy: string | null): Promise<{ runId: string; ok: boolean; error?: string }> {
  const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  const from = addDays(today, -45);
  const to = addDays(today, 150);
  const run = await prisma.rcSyncRun.create({ data: { trigger, startedBy, periodFrom: from, periodTo: to } });

  try {
    const { events, requests } = await rcFetchEvents(from, to);

    const [assets, channels, dealRows] = await Promise.all([
      prisma.asset.findMany({ select: { id: true, name: true, rcName: true } }),
      prisma.channel.findMany({ select: { id: true, name: true } }),
      prisma.deal.findMany({ where: { status: "ACTIVE" }, include: { asset: { select: { name: true } } } }),
    ]);
    const totals = await getDealTotals(dealRows.map((d) => d.id));
    const deals: OurDeal[] = dealRows.map((d) => ({
      id: d.id,
      number: d.number,
      assetId: d.assetId,
      assetName: d.asset.name,
      startDate: iso(d.startDate),
      endDate: iso(d.endDate),
      guestName: d.guestName,
      grossKop: d.grossKop,
      paidKop: totals.get(d.id)?.paidKop ?? 0,
      rcBookingId: d.rcBookingId,
    }));

    const result = reconcile({ events, deals, assets, channels, from: iso(from), to: iso(to) });

    // единственная запись в заезды: безопасные связи по точному совпадению
    for (const l of result.autoLinks) {
      try {
        await prisma.deal.update({ where: { id: l.dealId }, data: { rcBookingId: l.rcId } });
      } catch (e) {
        if ((e as { code?: string }).code !== "P2002") throw e; // эта бронь уже привязана к другому заезду — пропускаем
      }
    }

    const payload: RcRunSummary = { ...result, fetchedEvents: events.length, requests };
    await prisma.rcSyncRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), status: "ok", result: payload as unknown as Prisma.InputJsonValue } });
    return { runId: run.id, ok: true };
  } catch (e) {
    const msg = e instanceof RcError ? `${e.step}: ${e.message}` : e instanceof Error ? e.message : "Неизвестная ошибка";
    await prisma.rcSyncRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), status: "error", error: msg.slice(0, 1500) } });
    return { runId: run.id, ok: false, error: msg };
  }
}
