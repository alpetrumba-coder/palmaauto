import { getAccountBalances } from "@/lib/accounting";
import { formatKop, parseMoneyToKop } from "@/lib/money";
import { buildOperationData, type OperationInput } from "@/lib/operation-build";
import { prisma } from "@/lib/prisma";
import { createDealFromRc, linkDealToRc } from "@/lib/rc-actions-core";
import type { ReconcileResult } from "@/lib/rc-reconcile";
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

/** Черновик мог быть уже удалён (двойная доставка апдейта от Telegram и т.п.) — это не ошибка. */
async function safeDeleteDraft(id: string) {
  await prisma.telegramDraft.delete({ where: { id } }).catch((e) => {
    if ((e as { code?: string }).code !== "P2025") throw e;
  });
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
  // Один активный черновик-расход на чат: если был незавершённый — тихо заменяем новым.
  await prisma.telegramDraft.deleteMany({ where: { chatId: BigInt(chatId), kind: "expense" } });
  const draft = await prisma.telegramDraft.create({ data: { chatId: BigInt(chatId), kind: "expense", input: input as unknown as object, summary } });
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

async function handleExpenseCallback(chatId: number, messageId: number, cbId: string, action: string, draftId: string) {
  const draft = await prisma.telegramDraft.findUnique({ where: { id: draftId } });
  if (!draft || draft.chatId !== BigInt(chatId) || draft.kind !== "expense") {
    await answerCallbackQuery(cbId, "Черновик устарел.");
    return;
  }

  if (action === "no") {
    await safeDeleteDraft(draft.id);
    await editMessageText(chatId, messageId, `Отменено: ${draft.summary}`);
    await answerCallbackQuery(cbId, "Отменено");
    return;
  }

  const staff = await findStaffByChat(chatId);
  if (!staff) {
    await answerCallbackQuery(cbId, "Сотрудник не найден.");
    return;
  }
  const input = draft.input as unknown as OperationInput;
  const res = await buildOperationData(input);
  if ("error" in res) {
    await editMessageText(chatId, messageId, `Не получилось: ${res.error}`);
    await answerCallbackQuery(cbId, "Ошибка");
    await safeDeleteDraft(draft.id);
    return;
  }
  await prisma.operation.create({ data: { ...res.data, createdBy: staff.name } });
  await safeDeleteDraft(draft.id);
  await editMessageText(chatId, messageId, `Записано: ${draft.summary}`);
  await answerCallbackQuery(cbId, "Записано");
}

/** Ответ на вопрос «эта бронь RC — та же, что заезд №X, или другая?» (см. notifyRcAmbiguous). */
async function handleRcDupeCallback(chatId: number, messageId: number, cbId: string, action: "same" | "diff", draftId: string) {
  const draft = await prisma.telegramDraft.findUnique({ where: { id: draftId } });
  if (!draft || draft.chatId !== BigInt(chatId) || draft.kind !== "rcdupe") {
    await answerCallbackQuery(cbId, "Вопрос устарел.");
    return;
  }
  const { rcId, dealId } = draft.input as unknown as { rcId: number; dealId: string };
  const staff = await findStaffByChat(chatId);

  const res = action === "same" ? await linkDealToRc(dealId, rcId) : await createDealFromRc(rcId, staff?.name ?? "Telegram");
  await safeDeleteDraft(draft.id);
  if (!res.ok) {
    await editMessageText(chatId, messageId, `Не получилось: ${res.error}`);
    await answerCallbackQuery(cbId, "Ошибка");
    return;
  }
  await editMessageText(chatId, messageId, action === "same" ? `Связано как одна бронь. ${draft.summary}` : `Заведены как разные брони. ${draft.summary}`);
  await answerCallbackQuery(cbId, "Готово");
}

async function handleCallback(cb: NonNullable<TgUpdate["callback_query"]>) {
  const chatId = cb.message?.chat.id;
  const messageId = cb.message?.message_id;
  if (!chatId || !messageId || !cb.data) return;
  const parts = cb.data.split(":");

  if (parts[0] === "tgrc") {
    const [, action, draftId] = parts;
    await handleRcDupeCallback(chatId, messageId, cb.id, action === "same" ? "same" : "diff", draftId);
    return;
  }
  const [, action, draftId] = parts;
  await handleExpenseCallback(chatId, messageId, cb.id, action, draftId);
}

/** После сверки по расписанию: если нашлись похожие, но не идентичные брони (тот же объект, даты пересекаются),
 * спрашиваем владельцев в Telegram, одна это бронь или две разных, вместо того чтобы молча ждать, пока кто-то
 * откроет страницу сверки. */
export async function notifyRcAmbiguous(result: ReconcileResult) {
  const ambiguous = result.differs.filter((d) => d.ambiguous);
  if (ambiguous.length === 0) return;

  const owners = await prisma.staffUser.findMany({ where: { role: "OWNER", active: true, telegramChatId: { not: null } } });
  if (owners.length === 0) return;

  for (const d of ambiguous) {
    const summary = `${d.rc.assetName ?? d.rc.address} · у нас №${d.deal.number} ${d.deal.guestName} (${d.deal.startDate}–${d.deal.endDate}), в RC «${d.rc.guest}» (${d.rc.begin}–${d.rc.end})`;
    const text =
      `Похоже на дубль брони.\nОбъект: ${d.rc.assetName ?? d.rc.address}\n` +
      `У нас: заезд №${d.deal.number}, ${d.deal.guestName}, ${d.deal.startDate}–${d.deal.endDate}\n` +
      `В RealtyCalendar: ${d.rc.guest || "гость не указан"}, ${d.rc.begin}–${d.rc.end}${d.rc.source ? `, ${d.rc.source}` : ""}\n\n` +
      `Это одна и та же бронь (даты просто разошлись) или две разных?`;
    for (const owner of owners) {
      if (!owner.telegramChatId) continue;
      const draft = await prisma.telegramDraft.create({
        data: { chatId: owner.telegramChatId, kind: "rcdupe", input: { rcId: d.rc.rcId, dealId: d.deal.id }, summary },
      });
      await sendMessage(owner.telegramChatId, text, [
        [
          { text: "Это та же бронь", callback_data: `tgrc:same:${draft.id}` },
          { text: "Это другая", callback_data: `tgrc:diff:${draft.id}` },
        ],
      ]).catch((e) => console.error("[rc-dupe-notify]", e instanceof Error ? e.message : e));
    }
  }
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
