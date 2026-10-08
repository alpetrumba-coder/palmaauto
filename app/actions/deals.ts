"use server";

import { revalidatePath } from "next/cache";

import { fmtDate } from "@/lib/accounting-options";
import { parseMoneyToKop } from "@/lib/money";
import { parseDateInput } from "@/lib/rental-dates";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";

export type DealInput = {
  assetId: string;
  channelId: string;
  guestName: string;
  phone: string;
  startDate: string;
  endDate: string;
  gross: string;
  commission: string;
  comment: string;
};

export type DealResult = { ok: true; id: string } | { ok: false; error: string };

function revalidate(id?: string) {
  revalidatePath("/admin-panel/accounting");
  revalidatePath("/admin-panel/accounting/deals");
  if (id) revalidatePath(`/admin-panel/accounting/deals/${id}`);
}

async function validate(input: DealInput, selfId?: string) {
  const guestName = input.guestName.trim();
  if (!guestName) return { error: "Укажите имя гостя / арендатора." } as const;
  if (guestName.length > 200) return { error: "Имя слишком длинное." } as const;

  if (!input.assetId) return { error: "Выберите объект." } as const;
  const asset = await prisma.asset.findUnique({ where: { id: input.assetId } });
  if (!asset) return { error: "Объект не найден." } as const;

  const startDate = parseDateInput(input.startDate);
  const endDate = parseDateInput(input.endDate);
  if (!startDate || !endDate) return { error: "Укажите даты начала и окончания." } as const;
  if (endDate < startDate) return { error: "Дата окончания раньше даты начала." } as const;
  if (startDate.getTime() < Date.UTC(2024, 0, 1) || endDate.getTime() > Date.now() + 800 * 86400000) {
    return { error: "Даты вне допустимого диапазона." } as const;
  }
  if ((endDate.getTime() - startDate.getTime()) / 86400000 > 400) return { error: "Срок не может быть больше 400 суток." } as const;

  const grossKop = parseMoneyToKop(input.gross);
  if (grossKop === null || grossKop <= 0) return { error: "Сумма заезда — число больше нуля." } as const;

  const commissionKop = input.commission.trim() === "" ? 0 : parseMoneyToKop(input.commission);
  if (commissionKop === null) return { error: "Комиссия — число, например 3150 или 0." } as const;
  if (commissionKop > grossKop) return { error: "Комиссия больше суммы заезда." } as const;

  let channelId: string | null = null;
  if (input.channelId) {
    const ch = await prisma.channel.findUnique({ where: { id: input.channelId } });
    if (!ch) return { error: "Площадка не найдена." } as const;
    channelId = ch.id;
  }

  // Двойное бронирование: период [начало, конец) не должен пересекаться с другим действующим по тому же объекту.
  const clash = await prisma.deal.findFirst({
    where: {
      assetId: asset.id,
      status: "ACTIVE",
      ...(selfId ? { id: { not: selfId } } : {}),
      startDate: { lt: endDate.getTime() === startDate.getTime() ? new Date(endDate.getTime() + 86400000) : endDate },
      endDate: { gt: startDate },
    },
    select: { number: true, guestName: true, startDate: true, endDate: true },
  });
  if (clash) {
    return {
      error: `Даты пересекаются с заездом №${clash.number} (${clash.guestName}, ${fmtDate(clash.startDate)}–${fmtDate(clash.endDate)}) по этому объекту.`,
    } as const;
  }

  const comment = input.comment.trim();
  if (comment.length > 2000) return { error: "Комментарий слишком длинный." } as const;
  const phone = input.phone.trim();

  return {
    data: {
      assetId: asset.id,
      channelId,
      guestName,
      phone: phone || null,
      startDate,
      endDate,
      grossKop,
      commissionKop,
      comment: comment || null,
    },
  } as const;
}

export async function createDealAction(input: DealInput): Promise<DealResult> {
  const me = await requireAdminPanelSession();
  const res = await validate(input);
  if ("error" in res) return { ok: false, error: res.error as string };
  const deal = await prisma.deal.create({ data: { ...res.data, createdBy: me.name } });
  revalidate(deal.id);
  return { ok: true, id: deal.id };
}

export async function updateDealAction(id: string, input: DealInput): Promise<DealResult> {
  await requireAdminPanelSession();
  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Заезд/аренда не найдены." };
  if (existing.status === "CANCELLED") return { ok: false, error: "Отменённый нельзя изменить." };
  const res = await validate(input, id);
  if ("error" in res) return { ok: false, error: res.error as string };
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
