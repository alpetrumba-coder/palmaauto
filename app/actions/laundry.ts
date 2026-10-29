"use server";

import { revalidatePath } from "next/cache";

import { createLaundryOps, findLaundryTargets, splitEven } from "@/lib/laundry";
import { parseMoneyToKop } from "@/lib/money";
import { parseDateInput } from "@/lib/rental-dates";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";

export type LaundryPreview =
  | { ok: true; rows: { dealId: string; number: number; assetName: string; guestName: string; endDate: string; kop: number }[] }
  | { ok: false; error: string };

export async function previewLaundryAction(amount: string): Promise<LaundryPreview> {
  await requireAdminPanelSession();
  const totalKop = parseMoneyToKop(amount);
  if (totalKop === null || totalKop <= 0) return { ok: false, error: "Сумма — число больше нуля." };
  const targets = await findLaundryTargets();
  if (targets.length === 0) return { ok: false, error: "Нет краткосрочных заездов без стирки с выездом за последние 30 дней." };
  const parts = splitEven(totalKop, targets.length);
  return {
    ok: true,
    rows: targets.map((t, i) => ({ dealId: t.id, number: t.number, assetName: t.assetName, guestName: t.guestName, endDate: t.endDate.toISOString().slice(0, 10), kop: parts[i] })),
  };
}

export async function createLaundryAction(input: { amount: string; accountId: string; date: string; dealIds: string[] }): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const me = await requireAdminPanelSession();
  const totalKop = parseMoneyToKop(input.amount);
  if (totalKop === null || totalKop <= 0) return { ok: false, error: "Сумма — число больше нуля." };
  const date = parseDateInput(input.date);
  if (!date) return { ok: false, error: "Укажите дату." };
  if (!input.accountId || !(await prisma.cashAccount.findUnique({ where: { id: input.accountId } }))) return { ok: false, error: "Выберите кассу." };
  if (input.dealIds.length === 0) return { ok: false, error: "Нет броней для распределения." };
  try {
    const nums = await createLaundryOps({ totalKop, accountId: input.accountId, date, dealIds: input.dealIds, createdBy: me.name ?? "сотрудник" });
    revalidatePath("/admin-panel/accounting");
    return { ok: true, count: nums.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Не получилось записать." };
  }
}
