"use server";

import { revalidatePath } from "next/cache";

import { buildDealData, type DealInput } from "@/lib/deal-build";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";

export type { DealInput };
export type DealResult = { ok: true; id: string } | { ok: false; error: string };

function revalidate(id?: string) {
  revalidatePath("/admin-panel/accounting");
  revalidatePath("/admin-panel/accounting/deals");
  if (id) revalidatePath(`/admin-panel/accounting/deals/${id}`);
}

export async function createDealAction(input: DealInput): Promise<DealResult> {
  const me = await requireAdminPanelSession();
  const res = await buildDealData(input);
  if ("error" in res) return { ok: false, error: res.error };
  const deal = await prisma.deal.create({ data: { ...res.data, createdBy: me.name } });
  revalidate(deal.id);
  return { ok: true, id: deal.id };
}

export async function updateDealAction(id: string, input: DealInput): Promise<DealResult> {
  await requireAdminPanelSession();
  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Заезд/аренда не найдены." };
  if (existing.status === "CANCELLED") return { ok: false, error: "Отменённый нельзя изменить." };
  const res = await buildDealData(input, id);
  if ("error" in res) return { ok: false, error: res.error };
  await prisma.deal.update({ where: { id }, data: res.data });
  revalidate(id);
  return { ok: true, id };
}

/** Отмена заезда: запись и привязанные операции остаются (например, для возврата денег), но даты освобождаются. */
export async function cancelDealAction(id: string): Promise<DealResult> {
  await requireAdminPanelSession();
  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Заезд/аренда не найдены." };
  if (existing.status === "CANCELLED") return { ok: false, error: "Уже отменён." };
  await prisma.deal.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidate(id);
  return { ok: true, id };
}
