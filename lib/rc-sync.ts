import { Prisma } from "@prisma/client";

import { getDealTotals } from "@/lib/accounting";
import { createDealFromRow, rcSnapshotOf } from "@/lib/rc-actions-core";
import { RcError, rcFetchEvents } from "@/lib/rc-client";
import { buildRcRows, reconcile, type OurDeal, type RcRow, type ReconcileResult } from "@/lib/rc-reconcile";
import { isHighSeason } from "@/lib/season";
import { notifyRcAmbiguous } from "@/lib/telegram-bot";
import { prisma } from "@/lib/prisma";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const rd = (s: string) => `${s.slice(8, 10)}.${s.slice(5, 7)}`;
const rub = (kop: number) => `${(kop / 100).toLocaleString("ru-RU")} ₽`;

export type RcRunSummary = ReconcileResult & {
  fetchedEvents: number;
  requests: number;
  /** Номера заездов, созданных автоматически из броней RC в этом запуске. */
  autoCreated?: number[];
  /** Сколько заездов обновлено по изменениям в RC (даты, сумма, гость, объект). */
  updatedFromRc?: number;
  /** Сколько связанных заездов пропало из RC (помечены пунктиром). */
  missingInRc?: number;
};

type Snap = ReturnType<typeof rcSnapshotOf>;

/**
 * Применяет к связанным заездам то, что изменилось в RealtyCalendar, и помечает пропавшие брони.
 * Изменение берём, только если сама бронь в RC поменялась с прошлой сверки (снимок rcSnapshot):
 * ручную правку у нас сверка не затирает. Каждое изменение пишется в историю заезда (DealChange).
 */
async function syncLinkedDeals(rows: RcRow[], from: string, to: string, fetched: number): Promise<{ updated: number; missing: number }> {
  const byId = new Map(rows.map((r) => [r.rcId, r]));
  const deals = await prisma.deal.findMany({ where: { status: "ACTIVE", rcBookingId: { not: null } }, include: { channel: true, asset: { select: { name: true } } } });
  let updated = 0;
  let missing = 0;

  for (const d of deals) {
    const row = byId.get(d.rcBookingId as number);
    const ds = iso(d.startDate);
    const de = iso(d.endDate);

    if (!row) {
      // Пустой ответ RC — скорее сбой, чем «все брони удалены»: ничего не помечаем.
      if (fetched === 0) continue;
      const inRange = (ds >= from && ds <= to) || (de >= from && de <= to);
      if (!inRange) continue;
      missing++;
      if (!d.rcMissingSince) {
        await prisma.deal.update({
          where: { id: d.id },
          data: { rcMissingSince: new Date(), changes: { create: { source: "rc", text: "Брони больше нет в RealtyCalendar (удалена или отменена). Заезд оставлен у нас, проверьте." } } },
        });
      }
      continue;
    }
    if (!row.assetId) continue;

    const cur = rcSnapshotOf(row);
    const prev = d.rcSnapshot as Snap | null;
    const changedInRc = !prev || (Object.keys(cur) as (keyof Snap)[]).some((k) => prev[k] !== cur[k]);
    const logs: string[] = [];
    if (d.rcMissingSince) logs.push("Бронь снова есть в RealtyCalendar");

    const data: Prisma.DealUpdateInput = {};
    let touched = false;
    if (changedInRc) {
      if (ds !== row.begin || de !== row.end) {
        logs.push(`Даты: ${rd(ds)}–${rd(de)} → ${rd(row.begin)}–${rd(row.end)} (изменено в RealtyCalendar)`);
        data.startDate = new Date(`${row.begin}T00:00:00Z`);
        data.endDate = new Date(`${row.end}T00:00:00Z`);
        touched = true;
      }
      if (row.amountKop > 0 && row.amountKop !== d.grossKop) {
        const pct = d.channel ? (isHighSeason(new Date(`${row.begin}T00:00:00Z`)) ? d.channel.commissionHighPct : d.channel.commissionLowPct) : 0;
        logs.push(`Сумма: ${rub(d.grossKop)} → ${rub(row.amountKop)} (изменено в RealtyCalendar)`);
        data.grossKop = row.amountKop;
        data.commissionKop = Math.round((row.amountKop * pct) / 100);
        touched = true;
      }
      if (row.guest && row.guest !== d.guestName) {
        logs.push(`Гость: «${d.guestName}» → «${row.guest}» (изменено в RealtyCalendar)`);
        data.guestName = row.guest;
        touched = true;
      }
      if (row.phone && row.phone !== d.phone) {
        logs.push(`Телефон: ${d.phone ?? "—"} → ${row.phone} (изменено в RealtyCalendar)`);
        data.phone = row.phone;
        touched = true;
      }
      if (row.assetId !== d.assetId) {
        const a = await prisma.asset.findUnique({ where: { id: row.assetId }, select: { name: true } });
        logs.push(`Объект: ${d.asset.name} → ${a?.name ?? row.assetName} (изменено в RealtyCalendar)`);
        data.asset = { connect: { id: row.assetId } };
        touched = true;
      }
      data.rcSnapshot = cur;
    }
    if (!changedInRc && logs.length === 0) continue;
    if (d.rcMissingSince) data.rcMissingSince = null;
    if (logs.length > 0) data.changes = { create: logs.map((text) => ({ source: "rc", text })) };
    if (touched) updated++;
    await prisma.deal.update({ where: { id: d.id }, data });
  }
  return { updated, missing };
}

/**
 * Одна сверка: читает брони RealtyCalendar (45 дней назад — 150 вперёд) и приводит заезды в соответствие:
 *  1. связанные заезды обновляются по изменениям в RC (с записью в историю), пропавшие из RC помечаются;
 *  2. точные совпадения по объекту и датам связываются автоматически;
 *  3. брони RC, которых у нас нет, становятся заездами автоматически;
 *  4. похожие, но не точные брони (возможные дубли) решает человек — в отчёте и в Telegram.
 */
export async function runRcSync(trigger: "cron" | "manual", startedBy: string | null): Promise<{ runId: string; ok: boolean; error?: string }> {
  const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  const from = addDays(today, -45);
  const to = addDays(today, 150);
  const run = await prisma.rcSyncRun.create({ data: { trigger, startedBy, periodFrom: from, periodTo: to } });

  try {
    const { events, requests } = await rcFetchEvents(from, to);

    const [assets, channels] = await Promise.all([
      prisma.asset.findMany({ select: { id: true, name: true, rcName: true } }),
      prisma.channel.findMany({ select: { id: true, name: true } }),
    ]);
    const rows = buildRcRows(events, assets, channels, iso(from), iso(to));
    const rowById = new Map(rows.map((r) => [r.rcId, r]));

    const linked = await syncLinkedDeals(rows, iso(from), iso(to), events.length);

    const dealRows = await prisma.deal.findMany({ where: { status: "ACTIVE" }, include: { asset: { select: { name: true } } } });
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

    // безопасные связи по точному совпадению объекта и дат
    for (const l of result.autoLinks) {
      const row = rowById.get(l.rcId);
      try {
        await prisma.deal.update({
          where: { id: l.dealId },
          data: {
            rcBookingId: l.rcId,
            ...(row ? { rcSnapshot: rcSnapshotOf(row) } : {}),
            changes: { create: { source: "rc", text: `Связан с бронью RealtyCalendar №${l.rcId}` } },
          },
        });
      } catch (e) {
        if ((e as { code?: string }).code !== "P2002") throw e; // эта бронь уже привязана к другому заезду — пропускаем
      }
    }

    // брони, которых у нас нет, заводим как заезды; не вышло (например, пересечение с другим заездом) — остаются в отчёте
    const autoCreated: number[] = [];
    const stillMissing: RcRow[] = [];
    for (const m of result.missing) {
      if (!m.assetId) {
        stillMissing.push(m);
        continue;
      }
      const r = await createDealFromRow(m, "RealtyCalendar");
      if (r.ok) {
        const n = Number(/№(\d+)/.exec(r.message)?.[1]);
        if (n) autoCreated.push(n);
      } else stillMissing.push(m);
    }
    result.missing = stillMissing;
    result.summary.missing = stillMissing.length;

    // Сверка по расписанию — никто не смотрит на экран в этот момент: похожие (но не точные) брони
    // спрашиваем у владельцев прямо в Telegram, вместо того чтобы ждать, пока кто-то откроет страницу.
    if (trigger === "cron") {
      await notifyRcAmbiguous(result).catch((e) => console.error("[rc-sync] notifyRcAmbiguous", e instanceof Error ? e.message : e));
    }

    const payload: RcRunSummary = { ...result, fetchedEvents: events.length, requests, autoCreated, updatedFromRc: linked.updated, missingInRc: linked.missing };
    await prisma.rcSyncRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), status: "ok", result: payload as unknown as Prisma.InputJsonValue } });
    return { runId: run.id, ok: true };
  } catch (e) {
    const msg = e instanceof RcError ? `${e.step}: ${e.message}` : e instanceof Error ? e.message : "Неизвестная ошибка";
    await prisma.rcSyncRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), status: "error", error: msg.slice(0, 1500) } });
    return { runId: run.id, ok: false, error: msg };
  }
}
