import { getAccountBalances } from "@/lib/accounting";
import { formatKop, parseMoneyToKop } from "@/lib/money";
import { buildOperationData, type OperationInput } from "@/lib/operation-build";
import { prisma } from "@/lib/prisma";
import { answerCallbackQuery, editMessageText, sendMessage, type TgUpdate } from "@/lib/telegram";

const HELP =
  "Команды:\n" +
  "• расход 3000 уборка рио — записать расход\n" +
  "• остаток — остаток моей кассы\n" +
  "Если бот не понял фразу — попробуйте короче, например «расход 1500 моющие средства».";

const todayIso = () => new Date().toISOString().slice(0, 10);

async function findStaffByChat(chatId: number) {
  return prisma.staffUser.findUnique({ where: { telegramChatId: BigInt(chatId) } });
}

async function handleStart(chatId: number, code: string | undefined) {
  if (!code) {
    await sendMessage(chatId, "Этот чат ещё не привязан к сотруднику. Код для привязки выдаёт владелец на странице «Сотрудники».");
    return;
  }
  const staff = await prisma.staffUser.findUnique({ where: { telegramLinkCode: code.trim() } });
  if (!staff || !staff.telegramLinkExpires || staff.telegramLinkExpires.getTime() < Date.now()) {
    await sendMessage(chatId, "Код неверный или устарел. Попросите владельца показать его заново на странице «Сотрудники».");
    return;
  }
  if (!staff.active) {
    await sendMessage(chatId, "Этот сотрудник отключён. Обратитесь к владельцу.");
    return;
  }
  await prisma.staffUser.update({
    where: { id: staff.id },
    data: { telegramChatId: BigInt(chatId), telegramLinkCode: null, telegramLinkExpires: null },
  });
  await sendMessage(chatId, `Готово, ${staff.name}! Чат привязан. Наберите «остаток» или «помощь».`);
}

async function handleBalance(chatId: number, staff: { id: string; name: string; defaultCashAccountId: string | null }) {
  const balances = await getAccountBalances();
  const mine = balances.filter((b) => b.id === staff.defaultCashAccountId || b.responsible === staff.name);
  if (mine.length === 0) {
    await sendMessage(chatId, "За вами не закреплена касса. Попросите владельца указать её на странице «Сотрудники».");
    return;
  }
  const lines = mine.map((b) => `${b.name}: ${formatKop(b.balanceKop)}`);
  await sendMessage(chatId, lines.join("\n"));
}

const AMOUNT_RE = /(\d[\d\s]*(?:[.,]\d{1,2})?)/;

/** Разбор фразы «расход 3000 уборка рио»: сумма — первое число, остаток — текст для поиска статьи/объекта. */
async function handleExpense(chatId: number, staff: { id: string; name: string; defaultCashAccountId: string | null }, rest: string) {
  if (!staff.defaultCashAccountId) {
    await sendMessage(chatId, "За вами не закреплена касса по умолчанию. Попросите владельца указать её на странице «Сотрудники».");
    return;
  }
  const m = rest.match(AMOUNT_RE);
  if (!m) {
    await sendMessage(chatId, "Не нашёл сумму. Например: «расход 3000 уборка рио».");
    return;
  }
  const amountKop = parseMoneyToKop(m[1].replace(/\s/g, ""));
  if (amountKop === null || amountKop <= 0) {
    await sendMessage(chatId, "Сумма не распознана. Укажите число больше нуля.");
    return;
  }
  const words = rest.slice(m.index! + m[0].length).trim();

  const [categories, assets] = await Promise.all([
    prisma.category.findMany({ where: { kind: "EXPENSE", active: true } }),
    prisma.asset.findMany({ where: { active: true } }),
  ]);
  const lower = words.toLowerCase();
  const category = categories.find((c) => lower.includes(c.name.toLowerCase()));
  const asset = assets.find((a) => lower.includes(a.name.toLowerCase()));

  if (!category) {
    await sendMessage(chatId, `Не нашёл статью расхода в фразе «${words || rest}». Назовите её точнее (как в справочнике статей).`);
    return;
  }

  const input: OperationInput = {
    date: todayIso(),
    type: "EXPENSE",
    amount: (amountKop / 100).toFixed(2),
    accountId: staff.defaultCashAccountId,
    toAccountId: "",
    categoryId: category.id,
    assetId: asset?.id ?? "",
    dealId: "",
    comment: `Из Telegram: «${rest}»`,
  };
  const check = await buildOperationData(input);
  if ("error" in check) {
    await sendMessage(chatId, `Не получилось: ${check.error}`);
    return;
  }

  const summary = `Расход · ${category.name}${asset ? ` · ${asset.name}` : ""} · ${formatKop(amountKop)}`;
  const draft = await prisma.telegramDraft.upsert({
    where: { chatId: BigInt(chatId) },
    update: { input: input as unknown as object, summary },
    create: { chatId: BigInt(chatId), input: input as unknown as object, summary },
  });
  await sendMessage(chatId, `Проверьте: ${summary}`, [
    [
      { text: "✅ Верно", callback_data: `tg:yes:${draft.id}` },
      { text: "✖ Отмена", callback_data: `tg:no:${draft.id}` },
    ],
  ]);
}

async function handleText(chatId: number, text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("/start")) {
    await handleStart(chatId, trimmed.split(/\s+/)[1]);
    return;
  }

  const staff = await findStaffByChat(chatId);
  if (!staff) {
    await sendMessage(chatId, "Этот чат не привязан к сотруднику. Код для привязки выдаёт владелец на странице «Сотрудники», затем наберите /start <код>.");
    return;
  }
  if (!staff.active) {
    await sendMessage(chatId, "Доступ отключён владельцем.");
    return;
  }

  const lower = trimmed.toLowerCase();
  if (lower === "/start") {
    await sendMessage(chatId, `Чат уже привязан к ${staff.name}.`);
    return;
  }
  if (lower === "остаток" || lower === "/balance") {
    await handleBalance(chatId, staff);
    return;
  }
  if (lower.startsWith("расход")) {
    await handleExpense(chatId, staff, trimmed.replace(/^расход\s*/i, ""));
    return;
  }
  if (lower === "помощь" || lower === "/help") {
    await sendMessage(chatId, HELP);
    return;
  }
  await sendMessage(chatId, `Не понял команду. ${HELP}`);
}

async function handleCallback(cb: NonNullable<TgUpdate["callback_query"]>) {
  const chatId = cb.message?.chat.id;
  const messageId = cb.message?.message_id;
  if (!chatId || !messageId || !cb.data) return;
  const [, action, draftId] = cb.data.split(":");

  const draft = await prisma.telegramDraft.findUnique({ where: { id: draftId } });
  if (!draft || draft.chatId !== BigInt(chatId)) {
    await answerCallbackQuery(cb.id, "Черновик устарел.");
    return;
  }

  if (action === "no") {
    await prisma.telegramDraft.delete({ where: { id: draft.id } });
    await editMessageText(chatId, messageId, `Отменено: ${draft.summary}`);
    await answerCallbackQuery(cb.id, "Отменено");
    return;
  }

  const staff = await findStaffByChat(chatId);
  if (!staff) {
    await answerCallbackQuery(cb.id, "Сотрудник не найден.");
    return;
  }
  const input = draft.input as unknown as OperationInput;
  const res = await buildOperationData(input);
  if ("error" in res) {
    await editMessageText(chatId, messageId, `Не получилось: ${res.error}`);
    await answerCallbackQuery(cb.id, "Ошибка");
    await prisma.telegramDraft.delete({ where: { id: draft.id } });
    return;
  }
  await prisma.operation.create({ data: { ...res.data, createdBy: staff.name } });
  await prisma.telegramDraft.delete({ where: { id: draft.id } });
  await editMessageText(chatId, messageId, `Записано: ${draft.summary}`);
  await answerCallbackQuery(cb.id, "Записано");
}

export async function handleTelegramUpdate(update: TgUpdate) {
  if (update.message) {
    const chatId = update.message.chat.id;
    if (update.message.voice) {
      await sendMessage(chatId, "Голосовые сообщения пока не распознаются — скоро добавим. Напишите текстом, например «расход 3000 уборка рио».");
      return;
    }
    if (update.message.text) await handleText(chatId, update.message.text);
    return;
  }
  if (update.callback_query) await handleCallback(update.callback_query);
}
