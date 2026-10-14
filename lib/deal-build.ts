import { fmtDate } from "@/lib/accounting-options";
import { parseMoneyToKop } from "@/lib/money";
import { parseDateInput } from "@/lib/rental-dates";
import { prisma } from "@/lib/prisma";

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

export type BuiltDeal =
  | { error: string }
  | {
      data: {
        assetId: string;
        channelId: string | null;
        guestName: string;
        phone: string | null;
        startDate: Date;
        endDate: Date;
        grossKop: number;
        commissionKop: number;
        comment: string | null;
      };
    };

/** Проверяет ввод заезда/аренды и приводит к данным для записи. Общее для формы в админке и Telegram-бота. */
export async function buildDealData(input: DealInput, selfId?: string): Promise<BuiltDeal> {
  const guestName = input.guestName.trim();
  if (!guestName) return { error: "Укажите имя гостя / арендатора." };
  if (guestName.length > 200) return { error: "Имя слишком длинное." };

  if (!input.assetId) return { error: "Выберите объект." };
  const asset = await prisma.asset.findUnique({ where: { id: input.assetId } });
  if (!asset) return { error: "Объект не найден." };

  const startDate = parseDateInput(input.startDate);
  const endDate = parseDateInput(input.endDate);
  if (!startDate || !endDate) return { error: "Укажите даты начала и окончания." };
  if (endDate < startDate) return { error: "Дата окончания раньше даты начала." };
  if (startDate.getTime() < Date.UTC(2024, 0, 1) || endDate.getTime() > Date.now() + 800 * 86400000) {
    return { error: "Даты вне допустимого диапазона." };
  }
  if ((endDate.getTime() - startDate.getTime()) / 86400000 > 400) return { error: "Срок не может быть больше 400 суток." };

  const grossKop = parseMoneyToKop(input.gross);
  if (grossKop === null || grossKop <= 0) return { error: "Сумма заезда — число больше нуля." };

  const commissionKop = input.commission.trim() === "" ? 0 : parseMoneyToKop(input.commission);
  if (commissionKop === null) return { error: "Комиссия — число, например 3150 или 0." };
  if (commissionKop > grossKop) return { error: "Комиссия больше суммы заезда." };

  let channelId: string | null = null;
  if (input.channelId) {
    const ch = await prisma.channel.findUnique({ where: { id: input.channelId } });
    if (!ch) return { error: "Площадка не найдена." };
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
    };
  }

  const comment = input.comment.trim();
  if (comment.length > 2000) return { error: "Комментарий слишком длинный." };
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
  };
}
