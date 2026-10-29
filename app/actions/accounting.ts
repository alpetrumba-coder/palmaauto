"use server";

import { revalidatePath } from "next/cache";

import { START_DATE_KEY } from "@/lib/accounting";
import { deleteSetting, setSetting } from "@/lib/app-settings";
import { buildOperationData, type OperationInput } from "@/lib/operation-build";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelSession, requireOwner } from "@/lib/require-admin-panel";

export type AccountingResult = { ok: true } | { ok: false; error: string };
export type { OperationInput };

function revalidate(dealId?: string | null) {
  revalidatePath("/admin-panel/accounting");
  if (dealId) revalidatePath(`/admin-panel/accounting/deals/${dealId}`);
}

export async function createOperationAction(input: OperationInput): Promise<AccountingResult> {
  const me = await requireAdminPanelSession();
  const res = await buildOperationData(input);
  if ("error" in res) return { ok: false, error: res.error };
  await prisma.operation.create({ data: { ...res.data, createdBy: me.name } });
  revalidate(res.data.dealId);
  return { ok: true };
}

export async function updateOperationAction(id: string, input: OperationInput): Promise<AccountingResult> {
  await requireAdminPanelSession();
  const existing = await prisma.operation.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Операция не найдена." };
  if (existing.voidedAt) return { ok: false, error: "Аннулированную операцию изменить нельзя." };
  const res = await buildOperationData(input, { skipBinding: existing.isImported });
  if ("error" in res) return { ok: false, error: res.error };
  await prisma.operation.update({ where: { id }, data: res.data });
  revalidate(existing.dealId);
  revalidate(res.data.dealId);
  return { ok: true };
}

/** Аннулирование вместо удаления: строка остаётся в журнале, но не влияет на остатки и отчёты. */
export async function voidOperationAction(id: string): Promise<AccountingResult> {
  const me = await requireAdminPanelSession();
  const existing = await prisma.operation.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Операция не найдена." };
  if (existing.voidedAt) return { ok: false, error: "Операция уже аннулирована." };
  await prisma.operation.update({ where: { id }, data: { voidedAt: new Date(), voidedBy: me.name } });
  revalidate(existing.dealId);
  return { ok: true };
}

/** Дата начала учёта: с неё считаются остатки касс. Только владелец. Пусто — считать все операции. */
export async function setAccountingStartDateAction(date: string): Promise<AccountingResult> {
  const me = await requireOwner();
  const v = date.trim();
  if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { ok: false, error: "Дата в формате ГГГГ-ММ-ДД." };
  if (v) await setSetting(START_DATE_KEY, v, { by: me.name });
  else await deleteSetting(START_DATE_KEY);
  revalidatePath("/admin-panel/accounting");
  return { ok: true };
}
