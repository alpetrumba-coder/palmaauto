import { buildDealData, type DealInput } from "@/lib/deal-build";
import { prisma } from "@/lib/prisma";
import type { RcRunSummary } from "@/lib/rc-sync";
import { isHighSeason } from "@/lib/season";

export type RcCoreResult = { ok: true; message: string } | { ok: false; error: string };

/** Бронь RC по её id — ищем в последней успешной сверке (в «нет у нас» и в «расходятся»). */
export async function findRcRowInLastRun(rcId: number) {
  const run = await prisma.rcSyncRun.findFirst({ where: { status: "ok" }, orderBy: { startedAt: "desc" } });
  const res = run?.result as RcRunSummary | null | undefined;
  return res?.missing.find((m) => m.rcId === rcId) ?? res?.differs.find((d) => d.rc.rcId === rcId)?.rc ?? null;
}

/** Создаёт заезд из брони RealtyCalendar, которой нет у нас, и связывает их. Общая логика для веб-кнопки и Telegram-бота. */
export async function createDealFromRc(rcId: number, createdBy: string): Promise<RcCoreResult> {
  const row = await findRcRowInLastRun(rcId);
  if (!row || !row.assetId) return { ok: false, error: "Бронь не найдена в последней сверке. Запустите сверку заново." };
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
  const built = await buildDealData(input);
  if ("error" in built) return { ok: false, error: built.error };
  const deal = await prisma.deal.create({ data: { ...built.data, createdBy, rcBookingId: rcId } });
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
