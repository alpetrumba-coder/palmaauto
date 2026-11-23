"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { setDocDestination } from "@/lib/repair";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";

export type RepairResult = { ok: true } | { ok: false; error: string };

function revalidate() {
  revalidatePath("/admin-panel/remont-akirtava", "layout");
  revalidatePath("/admin-panel/accounting");
}

/** Привязать строку накладной к строке сметы (пусто — «вне сметы»). */
export async function setLineEstimateAction(lineId: string, estimateItemId: string): Promise<RepairResult> {
  await requireAdminPanelSession();
  const line = await prisma.repairDocLine.findUnique({ where: { id: lineId } });
  if (!line) return { ok: false, error: "Строка не найдена." };
  if (estimateItemId) {
    const item = await prisma.repairEstimateItem.findUnique({ where: { id: estimateItemId } });
    if (!item) return { ok: false, error: "Строка сметы не найдена." };
  }
  await prisma.repairDocLine.update({
    where: { id: lineId },
    data: { estimateItemId: estimateItemId || null, matchMode: estimateItemId ? "manual" : "none" },
  });
  revalidate();
  return { ok: true };
}

/** Накладная из Рубина: для Акиртавы или для Пальмы. */
export async function setDocDestinationAction(docId: string, destination: "akirtava" | "palma"): Promise<RepairResult> {
  await requireAdminPanelSession();
  try {
    await setDocDestination(docId, destination);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  revalidate();
  return { ok: true };
}
