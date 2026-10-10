"use server";

import { revalidatePath } from "next/cache";

import { createDealAction, type DealInput } from "@/app/actions/deals";
import { rcCheck, type RcDiagnostics } from "@/lib/rc-client";
import type { RcRunSummary } from "@/lib/rc-sync";
import { runRcSync } from "@/lib/rc-sync";
import { isHighSeason } from "@/lib/season";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelSession, requireOwner } from "@/lib/require-admin-panel";

export type RcActionResult = { ok: true; message: string } | { ok: false; error: string };

function revalidate() {
  revalidatePath("/admin-panel/accounting/rc");
  revalidatePath("/admin-panel/accounting/deals");
}

/** Проверка подключения: вход служебной учёткой и один запрос списка. Только владелец. */
export async function checkRcAction(): Promise<RcDiagnostics> {
  await requireOwner();
  return rcCheck();
}

/** Сверка по кнопке (то же, что делает расписание). Только владелец. */
export async function runRcSyncAction(): Promise<RcActionResult> {
  const me = await requireOwner();
  const r = await runRcSync("manual", me.name);
  revalidate();
  return r.ok ? { ok: true, message: "Сверка выполнена." } : { ok: false, error: r.error ?? "Сверка не удалась." };
}

async function rowFromLastRun(rcId: number) {
  const run = await prisma.rcSyncRun.findFirst({ where: { status: "ok" }, orderBy: { startedAt: "desc" } });
  const res = run?.result as RcRunSummary | null | undefined;
  return res?.missing.find((m) => m.rcId === rcId) ?? null;
}

/** Создаёт заезд из брони RealtyCalendar, которой нет у нас (данные берутся из последней сверки), и связывает их. */
export async function createDealFromRcAction(rcId: number): Promise<RcActionResult> {
  await requireAdminPanelSession();
  const row = await rowFromLastRun(rcId);
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
  const res = await createDealAction(input);
  if (!res.ok) return { ok: false, error: res.error };
  await prisma.deal.update({ where: { id: res.id }, data: { rcBookingId: rcId } }).catch(() => undefined);
  revalidate();
  return { ok: true, message: "Заезд создан и связан с бронью." };
}

/** Связывает существующий заезд с бронью RealtyCalendar (для строк «расходятся»: оператор подтверждает, что это одна и та же бронь). */
export async function linkDealToRcAction(dealId: string, rcId: number): Promise<RcActionResult> {
  await requireAdminPanelSession();
  try {
    await prisma.deal.update({ where: { id: dealId }, data: { rcBookingId: rcId } });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { ok: false, error: "Эта бронь RealtyCalendar уже привязана к другому заезду." };
    throw e;
  }
  revalidate();
  return { ok: true, message: "Связано. Расхождения останутся в сверке, пока вы не исправите заезд." };
}
