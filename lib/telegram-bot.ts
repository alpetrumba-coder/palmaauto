import { getAccountBalances } from "@/lib/accounting";
import { fmtDate } from "@/lib/accounting-options";
import { formatKop, parseMoneyToKop } from "@/lib/money";
import { buildOperationData, type OperationInput } from "@/lib/operation-build";
import { prisma } from "@/lib/prisma";
import { createDealFromRc, linkDealToRc } from "@/lib/rc-actions-core";
import type { ReconcileResult } from "@/lib/rc-reconcile";
import { recognizeOggOpus, speechConfigured, VOICE_MAX_SECONDS } from "@/lib/speech-to-text";
import { answerCallbackQuery, downloadFile, editMessageText, getFile, sendMessage, type TgUpdate, type TgVoice } from "@/lib/telegram";
import { findAccounts, matchAsset, matchCategory, parseAmount, parseDealNumber, stripDealNumber } from "@/lib/telegram-parse";

const HELP =
  "Пишите обычной фразой:\n" +
  "• расход 500 стирка заезд 23 — расход к заезду\n" +
  "• расход 1200 бензин приус карта х — расход по машине, с карты Х\n" +
  "• расход 3000 реклама — общий расход (без объекта)\n" +
  "• оплата 15000 заезд 23 амра — оплата гостя к заезду, на карту Амра-Банк\n" +
  "• передал 5000 в рубин — из вашей кассы в «Кассу Рубина»\n" +
  "• перемещение 3000 карта х касса ева — из одной кассы в другую\n" +
  "• остаток — остатки касс · статьи — список статей расходов\n" +
  "Касса не указана — берётся ваша касса по умолчанию. Перед записью бот покажет карточку: «Верно» / «Отмена».";

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

async function handleBalance(chatId: number, staff: Staff) {
  const balances = await getAccountBalances();
  const mine = balances.filter((b) => b.active && (staff.role === "OWNER" || b.id === staff.defaultCashAccountId || b.responsible === staff.name));
  if (mine.length === 0) {
    await sendMessage(chatId, "За вами не закреплена касса. Попросите владельца указать её на странице «Сотрудники».");
    return;
  }
  const lines = mine.map((b) => `${b.name}: ${formatKop(b.balanceKop)}`);
  await sendMessage(chatId, lines.join("\n"));
}

type Staff = { id: string; name: string; role: "OWNER" | "OPERATOR"; defaultCashAccountId: string | null };

async function loadRefs() {
  const [accounts, categories, assets] = await Promise.all([
    prisma.cashAccount.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, kind: true, aliases: true } }),
    prisma.asset.findMany({ where: { active: true }, select: { id: true, name: true, kind: true, aliases: true } }),
  ]);
  return { accounts, categories, assets };
}

const opComment = (text: string) => `Из Telegram: «${text.trim()}»`;

/** Проверяет операцию и присылает карточку с кнопками «Верно / Отмена». Один незавершённый черновик на чат. */
async function sendDraft(chatId: number, input: OperationInput, summary: string) {
  const check = await buildOperationData(input);
  if ("error" in check) {
    await sendMessage(chatId, `Не получилось: ${check.error}`);
    return;
  }
  await prisma.telegramDraft.deleteMany({ where: { chatId: BigInt(chatId), kind: "expense" } });
  const draft = await prisma.telegramDraft.create({ data: { chatId: BigInt(chatId), kind: "expense", input: input as unknown as object, summary } });
  await sendMessage(chatId, `Проверьте:\n${summary}`, [
    [
      { text: "✅ Верно", callback_data: `tg:yes:${draft.id}` },
      { text: "✖ Отмена", callback_data: `tg:no:${draft.id}` },
    ],
  ]);
}

/** «расход 500 стирка заезд 23 карта х» и «оплата 15000 заезд 23 амра». */
async function handleMoney(chatId: number, staff: Staff, kind: "INCOME" | "EXPENSE", text: string) {
  const example = kind === "INCOME" ? "оплата 15000 заезд 23" : "расход 500 стирка заезд 23";
  // «оплата за аренду 5000» — тут 5000 сумма, а не номер аренды: номер берём, только если осталась ещё и сумма.
  let dealNo = parseDealNumber(text);
  let parsed = parseAmount(stripDealNumber(text));
  if (dealNo !== null && !parsed) {
    dealNo = null;
    parsed = parseAmount(text);
  }
  if (!parsed) {
    await sendMessage(chatId, `Не нашёл сумму. Например: «${example}».`);
    return;
  }
  const refs = await loadRefs();

  let deal: { id: string; number: number; guestName: string; startDate: Date; endDate: Date; asset: { id: string; name: string; kind: "APARTMENT" | "CAR" } } | null = null;
  if (dealNo !== null) {
    deal = await prisma.deal.findFirst({ where: { number: dealNo, status: "ACTIVE" }, include: { asset: { select: { id: true, name: true, kind: true } } } });
    if (!deal) {
      await sendMessage(chatId, `Заезд/аренда №${dealNo} не найдены (или отменены). Проверьте номер в карточке заезда.`);
      return;
    }
  }
  const asset = deal ? deal.asset : matchAsset(parsed.rest, refs.assets);

  const accountId = findAccounts(parsed.rest, refs.accounts)[0]?.id ?? staff.defaultCashAccountId;
  if (!accountId) {
    await sendMessage(chatId, "Укажите кассу во фразе (например «карта х», «амра», «касса ева») — касса по умолчанию за вами не закреплена.");
    return;
  }

  const category =
    kind === "INCOME"
      ? (matchCategory(parsed.rest, refs.categories, "INCOME", asset?.kind) ?? refs.categories.find((c) => c.name === "Доходы от сдачи имущества в аренду") ?? null)
      : matchCategory(parsed.rest, refs.categories, "EXPENSE", asset?.kind);
  if (!category) {
    await sendMessage(chatId, `Не понял статью расхода в «${parsed.rest || text}». Напишите одно слово: стирка, уборка, бензин, ремонт, хоз, реклама… Список — «статьи».`);
    return;
  }

  const input: OperationInput = {
    date: todayIso(),
    type: kind,
    amount: parsed.amount,
    accountId,
    toAccountId: "",
    categoryId: category.id,
    assetId: deal ? "" : (asset?.id ?? ""),
    dealId: deal?.id ?? "",
    comment: opComment(`${kind === "INCOME" ? "оплата" : "расход"} ${text}`),
  };
  const kop = parseMoneyToKop(parsed.amount) ?? 0;
  const summary = [
    `${kind === "INCOME" ? "Приход" : "Расход"} · ${formatKop(kop)}`,
    `Статья: ${category.name}`,
    deal
      ? `Заезд №${deal.number} · ${deal.asset.name} · ${deal.guestName} (${fmtDate(deal.startDate)}–${fmtDate(deal.endDate)})`
      : asset
        ? `Объект: ${asset.name}`
        : "Объект: общий (без объекта)",
    `Касса: ${refs.accounts.find((a) => a.id === accountId)?.name ?? "—"}`,
  ].join("\n");
  await sendDraft(chatId, input, summary);
}

/** «передал 5000 в рубин», «перемещение 3000 карта х касса ева». */
async function handleTransfer(chatId: number, staff: Staff, text: string) {
  const parsed = parseAmount(text);
  if (!parsed) {
    await sendMessage(chatId, "Не нашёл сумму. Например: «передал 5000 в рубин».");
    return;
  }
  const refs = await loadRefs();
  const accs = findAccounts(parsed.rest, refs.accounts);
  let fromId: string | null = null;
  let toId: string | null = null;
  if (accs.length >= 2) {
    fromId = accs[0].id;
    toId = accs[1].id;
  } else if (accs.length === 1) {
    fromId = staff.defaultCashAccountId;
    toId = accs[0].id;
  }
  if (!toId) {
    await sendMessage(chatId, "Укажите, в какую кассу: например «передал 5000 в рубин» или «перемещение 3000 карта х касса ева».");
    return;
  }
  if (!fromId) {
    await sendMessage(chatId, "Укажите и кассу-источник: «перемещение 3000 карта х касса ева» (первая — откуда, вторая — куда).");
    return;
  }
  if (fromId === toId) {
    await sendMessage(chatId, "Касса «откуда» и «куда» совпадают. Назовите обе: первая — откуда, вторая — куда.");
    return;
  }
  const input: OperationInput = {
    date: todayIso(),
    type: "TRANSFER",
    amount: parsed.amount,
    accountId: fromId,
    toAccountId: toId,
    categoryId: "",
    assetId: "",
    dealId: "",
    comment: opComment(`перемещение ${text}`),
  };
  const name = (id: string) => refs.accounts.find((a) => a.id === id)?.name ?? "—";
  const summary = `Перемещение · ${formatKop(parseMoneyToKop(parsed.amount) ?? 0)}\nИз: ${name(fromId)}\nВ: ${name(toId)}`;
  await sendDraft(chatId, input, summary);
}

async function handleCategoriesList(chatId: number) {
  const cats = await prisma.category.findMany({ where: { active: true, kind: "EXPENSE" }, orderBy: { sortOrder: "asc" }, select: { name: true } });
  await sendMessage(chatId, `Статьи расходов:\n${cats.map((c) => `• ${c.name}`).join("\n")}\n\nМожно писать коротко: стирка, уборка, бензин, ремонт, хоз, реклама, связь, коммуналка.`);
}

const firstWordRest = (text: string) => text.replace(/^\S+\s*/, "");

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

  const lower = trimmed.toLowerCase().replace(/ё/g, "е");
  const first = lower.split(/\s+/)[0];
  if (lower === "/start") {
    await sendMessage(chatId, `Чат уже привязан к ${staff.name}.`);
    return;
  }
  if (first === "остаток" || first === "остатки" || lower === "/balance") {
    await handleBalance(chatId, staff);
    return;
  }
  if (first === "статьи" || lower === "/categories") {
    await handleCategoriesList(chatId);
    return;
  }
  if (first.startsWith("расход")) {
    await handleMoney(chatId, staff, "EXPENSE", firstWordRest(trimmed));
    return;
  }
  if (first.startsWith("оплат") || first.startsWith("приход")) {
    await handleMoney(chatId, staff, "INCOME", firstWordRest(trimmed));
    return;
  }
  if (["передал", "передала", "перевел", "перевела", "сдал", "сдала"].includes(first) || first.startsWith("перемещ")) {
    await handleTransfer(chatId, staff, firstWordRest(trimmed));
    return;
  }
  if (first === "помощь" || lower === "/help") {
    await sendMessage(chatId, HELP);
    return;
  }
  await sendMessage(chatId, `Не понял. ${HELP}`);
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

/** Голос → текст (SpeechKit) → тот же разбор, что у текстовых команд. */
async function handleVoice(chatId: number, voice: TgVoice) {
  if (!speechConfigured()) {
    await sendMessage(
      chatId,
      "Голосовые пока не подключены (нет ключа распознавания). Напишите текстом, например «расход 3000 уборка рио».",
    );
    return;
  }
  if (voice.duration != null && voice.duration > VOICE_MAX_SECONDS) {
    await sendMessage(chatId, `Слишком длинное голосовое (больше ${VOICE_MAX_SECONDS} сек). Скажите короче или напишите текстом.`);
    return;
  }

  await sendMessage(chatId, "Слушаю…");
  try {
    const { file_path } = await getFile(voice.file_id);
    const audio = await downloadFile(file_path);
    const stt = await recognizeOggOpus(audio);
    if (!stt.ok) {
      await sendMessage(chatId, `${stt.error} Можно повторить голосом или написать текстом.`);
      return;
    }
    await sendMessage(chatId, `Распознал: «${stt.text}»`);
    await handleText(chatId, stt.text);
  } catch (e) {
    console.error("[telegram-voice]", e instanceof Error ? e.message : e);
    await sendMessage(chatId, "Не удалось обработать голосовое. Напишите текстом, например «расход 3000 уборка рио».");
  }
}

export async function handleTelegramUpdate(update: TgUpdate) {
  if (update.message) {
    const chatId = update.message.chat.id;
    if (update.message.voice) {
      await handleVoice(chatId, update.message.voice);
      return;
    }
    if (update.message.text) await handleText(chatId, update.message.text);
    return;
  }
  if (update.callback_query) await handleCallback(update.callback_query);
}
