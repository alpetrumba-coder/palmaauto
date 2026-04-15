"use server";

import { revalidatePath } from "next/cache";

import { requireAdminPanelSession } from "@/lib/require-admin-panel";
import { prisma } from "@/lib/prisma";

export type ExtraServiceFormPayload = {
  name: string;
  pricePerDayRub: number;
  nonDailyPriceText: string;
  sortOrder: number;
  active: boolean;
};

function validatePayload(p: ExtraServiceFormPayload): string | null {
  const name = p.name.trim();
  if (name.length < 2 || name.length > 2000) {
    return "Название услуги — от 2 до 2000 символов.";
  }
  if (!Number.isFinite(p.pricePerDayRub) || p.pricePerDayRub < 0 || p.pricePerDayRub > 99_999_999) {
    return "Цена за сутки — целое число рублей от 0 (0, если тариф не за сутки).";
  }
  const note = p.nonDailyPriceText.trim();
  if (p.pricePerDayRub === 0) {
    if (note.length < 1 || note.length > 200) {
      return "При цене за сутки = 0 укажите текст во второй колонке прейскуранта (1–200 символов).";
    }
  } else if (note.length > 200) {
    return "Текст фиксированной цены не длиннее 200 символов (или оставьте пустым).";
  }
  if (!Number.isFinite(p.sortOrder) || p.sortOrder < 0 || p.sortOrder > 99_999) {
    return "Порядок в списке — число от 0 до 99999.";
  }
  return null;
}

export async function createExtraServiceAction(
  payload: ExtraServiceFormPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminPanelSession();
  const err = validatePayload(payload);
  if (err) return { ok: false, error: err };

  const name = payload.name.trim();
  const note = payload.nonDailyPriceText.trim();
  await prisma.extraService.create({
    data: {
      name,
      pricePerDayRub: Math.floor(payload.pricePerDayRub),
      nonDailyPriceText: payload.pricePerDayRub > 0 ? (note.length > 0 ? note : null) : note,
      sortOrder: Math.floor(payload.sortOrder),
      active: payload.active,
    },
  });

  revalidatePath("/admin-panel/extra-services");
  return { ok: true };
}

export async function updateExtraServiceAction(
  id: string,
  payload: ExtraServiceFormPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminPanelSession();
  const err = validatePayload(payload);
  if (err) return { ok: false, error: err };

  const existing = await prisma.extraService.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Услуга не найдена." };
  }

  const name = payload.name.trim();
  const note = payload.nonDailyPriceText.trim();
  await prisma.extraService.update({
    where: { id },
    data: {
      name,
      pricePerDayRub: Math.floor(payload.pricePerDayRub),
      nonDailyPriceText: payload.pricePerDayRub > 0 ? (note.length > 0 ? note : null) : note,
      sortOrder: Math.floor(payload.sortOrder),
      active: payload.active,
    },
  });

  revalidatePath("/admin-panel/extra-services");
  revalidatePath(`/admin-panel/extra-services/${id}/edit`);
  return { ok: true };
}

export async function deleteExtraServiceAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminPanelSession();
  const existing = await prisma.extraService.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Услуга не найдена." };
  }
  await prisma.extraService.delete({ where: { id } });
  revalidatePath("/admin-panel/extra-services");
  return { ok: true };
}
