import type { Prisma } from "@prisma/client";

import { parseMoneyToKop } from "@/lib/money";
import { parseDateInput } from "@/lib/rental-dates";
import { prisma } from "@/lib/prisma";

export type OperationInput = {
  date: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER" | "HANDOVER";
  amount: string;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  assetId: string;
  dealId: string;
  comment: string;
};

const TYPES = ["INCOME", "EXPENSE", "TRANSFER", "HANDOVER"];

/** Проверяет ввод и приводит к данным для записи; ошибка — понятным текстом для оператора. Общее для формы в админке и Telegram-бота. */
export type BuiltOperation = { error: string } | { data: Omit<Prisma.OperationUncheckedCreateInput, "createdBy"> };

export async function buildOperationData(input: OperationInput): Promise<BuiltOperation> {
  if (!TYPES.includes(input.type)) return { error: "Выберите вид операции." };

  const date = parseDateInput(input.date);
  if (!date) return { error: "Укажите дату." };
  const now = Date.now();
  if (date.getTime() < Date.UTC(2024, 0, 1) || date.getTime() > now + 400 * 86400000) {
    return { error: "Дата вне допустимого диапазона." };
  }

  const amountKop = parseMoneyToKop(input.amount);
  if (amountKop === null || amountKop <= 0) return { error: "Сумма — число больше нуля, например 3500 или 3500,50." };

  if (!input.accountId) {
    return { error: input.type === "INCOME" ? "Выберите кассу, куда пришли деньги." : "Выберите кассу, откуда списать." };
  }
  const account = await prisma.cashAccount.findUnique({ where: { id: input.accountId } });
  if (!account) return { error: "Касса не найдена." };

  let toAccountId: string | null = null;
  if (input.type === "TRANSFER") {
    if (!input.toAccountId) return { error: "Выберите кассу-получателя." };
    if (input.toAccountId === input.accountId) return { error: "Касса-получатель должна отличаться от кассы-источника." };
    const to = await prisma.cashAccount.findUnique({ where: { id: input.toAccountId } });
    if (!to) return { error: "Касса-получатель не найдена." };
    toAccountId = to.id;
  }

  let categoryId: string | null = null;
  if (input.type === "INCOME" || input.type === "EXPENSE") {
    if (!input.categoryId) return { error: "Выберите статью." };
    const cat = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!cat) return { error: "Статья не найдена." };
    if ((input.type === "INCOME") !== (cat.kind === "INCOME")) {
      return { error: input.type === "INCOME" ? "Для прихода выберите статью дохода." : "Для расхода выберите статью расхода." };
    }
    categoryId = cat.id;
  }

  // К заезду/аренде и объекту привязываются только приходы и расходы; объект берётся из заезда.
  let assetId: string | null = null;
  let dealId: string | null = null;
  if (input.type === "INCOME" || input.type === "EXPENSE") {
    if (input.dealId) {
      const deal = await prisma.deal.findUnique({ where: { id: input.dealId } });
      if (!deal) return { error: "Заезд/аренда не найдены." };
      dealId = deal.id;
      assetId = deal.assetId;
    } else if (input.assetId) {
      const asset = await prisma.asset.findUnique({ where: { id: input.assetId } });
      if (!asset) return { error: "Объект не найден." };
      assetId = asset.id;
    }
  }

  const comment = input.comment.trim();
  if (comment.length > 1000) return { error: "Комментарий слишком длинный (до 1000 символов)." };
  // Расход/приход без объекта и без заезда — значит, общий (на несколько объектов или за период).
  // Для таких просим короткое пояснение в комментарии: как он распределяется — это видно в журнале.
  if ((input.type === "INCOME" || input.type === "EXPENSE") && !assetId && !dealId && comment.length < 5) {
    return { error: "Это общий расход (без объекта)? Коротко опишите в комментарии, на что он распределяется — например «поровну на все квартиры, октябрь»." };
  }

  return {
    data: {
      date,
      type: input.type,
      amountKop,
      accountId: account.id,
      toAccountId,
      categoryId,
      assetId,
      dealId,
      comment: comment || null,
    },
  };
}
