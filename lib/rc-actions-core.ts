import { buildDealData, type DealInput } from "@/lib/deal-build";
import { prisma } from "@/lib/prisma";
import type { RcRow } from "@/lib/rc-reconcile";
import type { RcRunSummary } from "@/lib/rc-sync";
import { isHighSeason } from "@/lib/season";

export type RcCoreResult = { ok: true; message: string } | { ok: false; error: string };

/** Бронь RC по её id — ищем в последней успешной сверке (в «нет у нас» и в «расходятся»). */
export async function findRcRowInLastRun(rcId: number) {
  const run = await prisma.rcSyncRun.findFirst({ where: { status: "ok" }, orderBy: { startedAt: "desc" } });
  const res = run?.result as RcRunSummary | null | undefined;
  return res?.missing.find((m) => m.rcId === rcId) ?? res?.differs.find((d) => d.rc.rcId === rcId)?.rc ?? null;
}

/** Снимок значений брони RC, которые мы применили к заезду: по нему сверка отличает изменение в RC от ручной правки у нас. */
export const rcSnapshotOf = (r: RcRow) => ({ begin: r.begin, end: r.end, guest: r.guest, phone: r.phone, amountKop: r.amountKop, assetId: r.assetId });

/** Создаёт заезд из брони RealtyCalendar по её id (ищем в последней сверке). Для веб-кнопки и Telegram-бота. */
export async function createDealFromRc(rcId: number, createdBy: string): Promise<RcCoreResult> {
  const row = await findRcRowInLastRun(rcId);
  if (!row || !row.assetId) return { ok: false, error: "Бронь не найдена в последней сверке. Запустите сверку заново." };
  return createDealFromRow(row, createdBy);
}

/** Создаёт заезд из брони RealtyCalendar и связывает их (rcBookingId). Сумма 0 допустима — в RC бывают брони без цены. */
export async function createDealFromRow(row: RcRow, createdBy: string): Promise<RcCoreResult> {
  const rcId = row.rcId;
  if (!row.assetId) return { ok: false, error: "Объект брони не сопоставлен." };
  if (await prisma.deal.findUnique({ where: { rcBookingId: rcId } })) return { ok: false, error: "Эта бронь уже есть в заездах." };

  const ch = row.channelId ? await prisma.channel.findUnique({ where: { id: row.channelId } }) : null;
  const pct = ch ? (isHighSeason(new Date(`${row.begin}T00:00:00Z`)) ? ch.commissionHighPct : ch.commissionLowPct) : 0;
  const commissionKop = Math.round((row.amountKop * pct) / 100);
  const input: DealInput = {
    assetId: row.assetId,
    channelId: row.channelId ?? "",
    guestName: row.guest || "Гость (RealtyCalendar)",
    phone: row.phone,
    startDate: row.begin,
    endDate: row.end,
    gross: (row.amountKop / 100).toFixed(2),
    commission: (commissionKop / 100).toFixed(2),
    comment: `Из RealtyCalendar №${rcId}${row.source ? ` (${row.source})` : ""}; в RC оплачено ${(row.paidKop / 100).toLocaleString("ru-RU")} ₽ — оплаты внесите операциями`,
  };
  const built = await buildDealData(input, undefined, { allowZeroGross: true });
  if ("error" in built) return { ok: false, error: built.error };
  const deal = await prisma.deal.create({
    data: {
      ...built.data,
      createdBy,
      rcBookingId: rcId,
      rcSnapshot: rcSnapshotOf(row),
      changes: { create: { source: "rc", text: `Создан из брони RealtyCalendar №${rcId}` } },
    },
  });
  return { ok: true, message: `Заезд №${deal.number} создан и связан с бронью.` };
}

/** Связывает существующий заезд с бронью RealtyCalendar (подтверждение: это одна и та же бронь). */
export async function linkDealToRc(dealId: string, rcId: number): Promise<RcCoreResult> {
  try {
    await prisma.deal.update({ where: { id: dealId }, data: { rcBookingId: rcId } });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { ok: false, error: "Эта бронь RealtyCalendar уже привязана к другому заезду." };
    throw e;
  }
  return { ok: true, message: "Связано." };
}
