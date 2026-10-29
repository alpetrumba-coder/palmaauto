import { getAccountBalances } from "@/lib/accounting";
import { fmtDate } from "@/lib/accounting-options";
import { formatKop, parseMoneyToKop } from "@/lib/money";
import { buildOperationData, type OperationInput } from "@/lib/operation-build";
import { prisma } from "@/lib/prisma";
import { createDealFromRc, linkDealToRc } from "@/lib/rc-actions-core";
import type { ReconcileResult } from "@/lib/rc-reconcile";
import { recognizeOggOpus, speechConfigured, VOICE_MAX_SECONDS } from "@/lib/speech-to-text";
import { answerCallbackQuery, downloadFile, editMessageText, getFile, sendMessage, type InlineButton, type TgUpdate, type TgVoice } from "@/lib/telegram";
import { applyText, detectIntent, dropIntentWord, missingFields, QUESTION, renderCard, type CardDeal, type OpDraft, type OpType, type Refs } from "@/lib/telegram-draft";
import { createLaundryOps, findLaundryTargets, splitEven } from "@/lib/laundry";
import { findAccounts, matchCategory, parseAmount, parseDealNumbers } from "@/lib/telegram-parse";
import { buildDealData, type DealInput } from "@/lib/deal-build";
import {
  applyBookingText,
  BOOKING_QUESTION,
  commissionKop,
  isBookingIntent,
  missingBookingFields,
  renderBookingCard,
  type BChannel,
  type BookingDraft,
} from "@/lib/telegram-booking";

const HELP =
  "Скажите голосом или напишите, что случилось — в любом порядке:\n" +
  "• расход уборка Рио 1500 заезд 34\n" +
  "• оплата 15000 заезд 34 амра\n" +
  "• сдала 5000 в Рубин\n" +
  "• стирка 1000 заезд 6 и 52 — поровну на эти брони\n" +
  "• новая бронь Рио с 5 по 10 ноября Иванов 25000 Авито — бронь квартиры\n" +
  "Бот покажет карточку и спросит, чего не хватает (сумма, статья, заезд или объект, касса). Отвечайте коротко — " +
  "«34», «Иванов», «с карты х» — фразу целиком повторять не нужно. Исправить: «не 1500, а 1800». " +
  "В учёт попадает только после кнопки «Записать».\n" +
  "• остаток — остатки касс · статьи — список статей · отмена — сбросить карточку";

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

async function loadRefs(): Promise<Refs> {
  const [accounts, categories, assets] = await Promise.all([
    prisma.cashAccount.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, kind: true, aliases: true, binding: true } }),
    prisma.asset.findMany({ where: { active: true }, select: { id: true, name: true, kind: true, aliases: true } }),
  ]);
  return { accounts, categories, assets };
}

/** Незаконченная карточка живёт 30 минут: после этого новая фраза без «расход/оплата…» не дописывается в старую. */
const OP_DRAFT_TTL_MS = 30 * 60 * 1000;
const money = (rub: string) => formatKop(parseMoneyToKop(rub) ?? 0);
const ddmm = (d: Date) => fmtDate(d).slice(0, 5);

/** Открытая карточка чата: операция ("op") или новая бронь ("bk") — последняя по времени. */
async function activeOpDraft(chatId: number) {
  const row = await prisma.telegramDraft.findFirst({ where: { chatId: BigInt(chatId), kind: { in: ["op", "bk"] } }, orderBy: { createdAt: "desc" } });
  if (!row) return null;
  if (Date.now() - row.createdAt.getTime() > OP_DRAFT_TTL_MS) {
    await safeDeleteDraft(row.id);
    return null;
  }
  return row;
}

type DealRow = { id: string; number: number; guestName: string; startDate: Date; endDate: Date; assetId: string; asset: { name: string; kind: "APARTMENT" | "CAR" } };
const dealInclude = { asset: { select: { name: true, kind: true } } } as const;
const toCardDeal = (d: DealRow): CardDeal => ({ number: d.number, guestName: d.guestName, assetName: d.asset.name, start: ddmm(d.startDate), end: ddmm(d.endDate) });
const dealButton = (draftId: string, d: DealRow): InlineButton => ({
  text: `№${d.number} ${d.asset.name} · ${d.guestName.slice(0, 16)} · ${ddmm(d.startDate)}`,
  callback_data: `op:d:${draftId}:${d.id}`,
});

/** Брони-подсказки для кнопок: по объекту — ближайшие к сегодняшнему дню, без объекта — те, что идут сейчас. */
async function dealSuggestions(d: OpDraft): Promise<DealRow[]> {
  const today = new Date(`${todayIso()}T00:00:00Z`);
  const day = 86400000;
  const where = d.assetId
    ? { status: "ACTIVE" as const, assetId: d.assetId, endDate: { gte: new Date(today.getTime() - 30 * day) }, startDate: { lte: new Date(today.getTime() + 60 * day) } }
    : { status: "ACTIVE" as const, endDate: { gte: new Date(today.getTime() - 5 * day) }, startDate: { lte: new Date(today.getTime() + 3 * day) } };
  const rows = (await prisma.deal.findMany({ where, include: dealInclude, take: 40 })) as DealRow[];
  return rows.sort((a, b) => Math.abs(a.startDate.getTime() - today.getTime()) - Math.abs(b.startDate.getTime() - today.getTime())).slice(0, 6);
}

/** Статья прихода по брони: машина — аренда машин; квартира от 28 ночей — долгосрочно; иначе — посуточно. */
function incomeCategoryFor(deal: DealRow, refs: Refs): string | undefined {
  const nights = Math.round((deal.endDate.getTime() - deal.startDate.getTime()) / 86400000);
  const names =
    deal.asset.kind === "CAR"
      ? ["Доходы от сдачи машин в аренду посуточно", "Доходы от сдачи имущества в аренду"]
      : nights >= 28
        ? ["Доходы от сдачи недвижимости в аренду долгосрочно", "Оплата за жилье (долгосрочные жильцы)"]
        : ["Доходы от сдачи недвижимости в аренду посуточно", "Доходы от сдачи имущества в аренду"];
  for (const n of names) {
    const c = refs.categories.find((x) => x.kind === "INCOME" && x.name === n);
    if (c) return c.id;
  }
  return undefined;
}

/**
 * Один шаг карточки: дописать фразу (или выбор кнопкой), найти бронь, подставить кассу сотрудника,
 * сохранить и показать карточку с одним вопросом — или с кнопкой «Записать», если всё заполнено.
 */
async function stepOp(chatId: number, staff: Staff, base: OpDraft, text: string | null, oldId: string | null, patch?: Partial<OpDraft>) {
  const refs = await loadRefs();
  const notes: string[] = [];
  let d: OpDraft = { ...base, ...patch };
  let guestMatches: DealRow[] = [];

  if (text !== null && text.trim()) {
    const curDeal = d.dealId ? ((await prisma.deal.findUnique({ where: { id: d.dealId }, include: dealInclude })) as DealRow | null) : null;
    const r = applyText(d, text, refs, todayIso(), curDeal?.asset.kind);
    d = r.draft;
    if (r.dealNo !== undefined) {
      const found = (await prisma.deal.findFirst({ where: { number: r.dealNo, status: "ACTIVE" }, include: dealInclude })) as DealRow | null;
      if (found) {
        d.dealId = found.id;
        d.assetId = found.assetId;
      } else notes.push(`Бронь №${r.dealNo} не найдена (или отменена).`);
    } else if (r.guestQuery) {
      const words = r.guestQuery.split(" ").slice(0, 3);
      guestMatches = (await prisma.deal.findMany({
        where: {
          status: "ACTIVE",
          endDate: { gte: new Date(Date.now() - 90 * 86400000) },
          OR: words.map((w) => ({ guestName: { contains: w, mode: "insensitive" as const } })),
          ...(d.assetId ? { assetId: d.assetId } : {}),
        },
        include: dealInclude,
        orderBy: { startDate: "desc" },
        take: 6,
      })) as DealRow[];
      if (guestMatches.length === 1) {
        d.dealId = guestMatches[0].id;
        d.assetId = guestMatches[0].assetId;
        guestMatches = [];
      } else if (guestMatches.length === 0) notes.push(`Не нашёл бронь по «${r.guestQuery}».`);
    }
  }

  if (patch?.dealId) {
    const pd = await prisma.deal.findUnique({ where: { id: patch.dealId }, select: { assetId: true } });
    if (pd) d.assetId = pd.assetId;
  }
  const deal = d.dealId ? ((await prisma.deal.findUnique({ where: { id: d.dealId }, include: dealInclude })) as DealRow | null) : null;
  if (d.type === "INCOME" && deal && !d.categoryId) d.categoryId = incomeCategoryFor(deal, refs);
  if (!d.accountId && staff.defaultCashAccountId) d.accountId = staff.defaultCashAccountId;

  const missing = missingFields(d, refs);
  d.awaiting = missing[0];

  if (oldId) await safeDeleteDraft(oldId);
  const card = renderCard(d, refs, deal ? toCardDeal(deal) : null, money);
  const row = await prisma.telegramDraft.create({ data: { chatId: BigInt(chatId), kind: "op", input: d as unknown as object, summary: card } });

  const cancel: InlineButton = { text: "✖ Отмена", callback_data: `op:no:${row.id}` };
  const head = notes.length ? `${notes.join("\n")}\n\n` : "";
  if (missing.length === 0) {
    await sendMessage(chatId, `${head}${card}\n\nВсё заполнено. Чтобы исправить — просто скажите исправление.`, [
      [{ text: "✅ Записать", callback_data: `op:yes:${row.id}` }, cancel],
    ]);
    return;
  }

  const field = missing[0];
  const buttons: InlineButton[][] = [];
  if (field === "deal") {
    const list = guestMatches.length > 0 ? guestMatches : await dealSuggestions(d);
    for (const x of list) buttons.push([dealButton(row.id, x)]);
  } else if (field === "category") {
    const cats = refs.categories.filter((c) => c.kind === (d.type === "INCOME" ? "INCOME" : "EXPENSE") && (d.type === "INCOME" || c.binding)).slice(0, 10);
    for (let i = 0; i < cats.length; i += 2) buttons.push(cats.slice(i, i + 2).map((c) => ({ text: c.name.slice(0, 30), callback_data: `op:c:${row.id}:${c.id}` })));
  } else if (field === "account" || field === "to") {
    const accs = refs.accounts.filter((a) => field !== "to" || a.id !== d.accountId);
    for (let i = 0; i < accs.length; i += 2) buttons.push(accs.slice(i, i + 2).map((a) => ({ text: a.name, callback_data: `op:${field === "to" ? "t" : "a"}:${row.id}:${a.id}` })));
  }
  buttons.push([cancel]);
  await sendMessage(chatId, `${head}${card}\n\n${QUESTION[field]}`, buttons);
}

async function startOp(chatId: number, staff: Staff, type: OpType, text: string) {
  await prisma.telegramDraft.deleteMany({ where: { chatId: BigInt(chatId), kind: "bk" } });
  const old = await prisma.telegramDraft.findFirst({ where: { chatId: BigInt(chatId), kind: "op" } });
  await stepOp(chatId, staff, { type, date: todayIso(), texts: [] }, text, old?.id ?? null);
}

async function handleCategoriesList(chatId: number) {
  const cats = await prisma.category.findMany({ where: { active: true, kind: "EXPENSE" }, orderBy: { sortOrder: "asc" }, select: { name: true, binding: true } });
  const tag = (b: string | null) => (b === "deal" ? " — к заезду" : b === "object" ? " — к объекту" : b === "general" ? " — общий" : "");
  await sendMessage(chatId, `Статьи расходов:\n${cats.map((c) => `• ${c.name}${tag(c.binding)}`).join("\n")}\n\nМожно говорить коротко: стирка, уборка, бензин, ремонт, реклама, связь, коммуналка.`);
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
  if (first === "помощь" || lower === "/help") {
    await sendMessage(chatId, HELP);
    return;
  }
  if (first === "отмена") {
    const cur = await activeOpDraft(chatId);
    if (cur) await safeDeleteDraft(cur.id);
    await sendMessage(chatId, cur ? "Карточка отменена." : "Нечего отменять.");
    return;
  }

  // «новая бронь Рио с 5 по 10 ноября Иванов 25000 Авито»
  if (isBookingIntent(trimmed)) {
    await startBooking(chatId, trimmed);
    return;
  }

  // «стирка 6000 распредели» — одна сумма на все краткосрочные брони без стирки
  if (/распредел/.test(lower) && /(стирк|прачечн|бель)/.test(lower)) {
    await handleLaundry(chatId, staff, trimmed);
    return;
  }

  const intent = detectIntent(trimmed);
  // «стирка 1000 заезд 6 и 52» — расход поровну на названные брони
  const multi = parseDealNumbers(intent ? dropIntentWord(trimmed) : trimmed);
  if (multi.numbers.length >= 2 && (intent === null || intent === "EXPENSE")) {
    await handleSplit(chatId, staff, trimmed, multi);
    return;
  }
  if (intent) {
    await startOp(chatId, staff, intent, dropIntentWord(trimmed));
    return;
  }
  const refs = await loadRefs();
  // новая операция без слова «расход»: статья и сумма во фразе
  const looksNew = /\d/.test(trimmed) && !!matchCategory(trimmed, refs.categories, "EXPENSE");
  // без слова «расход/оплата…» — это ответ на вопрос открытой карточки, если только фраза не начинает новую операцию
  const cur = await activeOpDraft(chatId);
  if (cur?.kind === "bk") {
    if (!looksNew) {
      await stepBooking(chatId, cur.input as unknown as BookingDraft, trimmed, cur.id);
      return;
    }
    await safeDeleteDraft(cur.id);
    await sendMessage(chatId, "Незаконченную бронь отменил — начинаю операцию.");
  } else if (cur) {
    const d = cur.input as unknown as OpDraft;
    if (!(looksNew && (d.type === "TRANSFER" || (d.amount && d.categoryId)))) {
      await stepOp(chatId, staff, d, trimmed, cur.id);
      return;
    }
    await sendMessage(chatId, "Прошлую незаконченную карточку отменил — начинаю новую.");
  }
  // «уборка рио 1500» без слова «расход» — тоже расход, если узнали статью и есть сумма
  if (looksNew) {
    await startOp(chatId, staff, "EXPENSE", trimmed);
    return;
  }
  await sendMessage(chatId, `Не понял. ${HELP}`);
}

type LaundryDraft = { totalKop: number; accountId: string; dealIds: string[]; said: string; categoryName?: string };

/** «стирка 1000 касса ева заезд 6 и 52» — расход по статье «к заезду» поровну на названные брони (после подтверждения). */
async function handleSplit(chatId: number, staff: Staff, text: string, multi: { numbers: number[]; rest: string }) {
  const refs = await loadRefs();
  const parsed = parseAmount(multi.rest);
  const cat = matchCategory(multi.rest, refs.categories, "EXPENSE");
  const binding = refs.categories.find((c) => c.id === cat?.id)?.binding;
  if (!parsed || !cat || binding !== "deal") {
    await sendMessage(
      chatId,
      "Поровну на несколько броней делятся только расходы к заезду (стирка, уборка, комиссии…). Скажите статью и сумму: «стирка 1000 касса Ева заезд 6 и 52».",
    );
    return;
  }
  const deals = await prisma.deal.findMany({ where: { number: { in: multi.numbers }, status: "ACTIVE" }, include: dealInclude, orderBy: { number: "asc" } });
  const missing = multi.numbers.filter((n) => !deals.some((d) => d.number === n));
  if (missing.length) {
    await sendMessage(chatId, `Не нашёл действующие брони: ${missing.map((n) => `№${n}`).join(", ")}. Проверьте номера на шахматке.`);
    return;
  }
  const accountId = findAccounts(multi.rest, refs.accounts)[0]?.id ?? staff.defaultCashAccountId;
  if (!accountId) {
    await sendMessage(chatId, "Укажите кассу: например «стирка 1000 касса Ева заезд 6 и 52».");
    return;
  }
  const totalKop = parseMoneyToKop(parsed.amount) ?? 0;
  const parts = splitEven(totalKop, deals.length);
  await prisma.telegramDraft.deleteMany({ where: { chatId: BigInt(chatId), kind: "laundry" } });
  const input: LaundryDraft = { totalKop, accountId, dealIds: deals.map((d) => d.id), said: `Из Telegram: «${text}»`, categoryName: cat.name };
  const summary = `${cat.name} ${formatKop(totalKop)} → ${deals.length} брон. · касса ${refs.accounts.find((a) => a.id === accountId)?.name ?? "—"}`;
  const row = await prisma.telegramDraft.create({ data: { chatId: BigInt(chatId), kind: "laundry", input: input as unknown as object, summary } });
  const lines = deals.map((d, i) => `№${d.number} ${d.asset.name} · ${d.guestName.slice(0, 18)} (${ddmm(d.startDate)}–${ddmm(d.endDate)}) — ${formatKop(parts[i])}`);
  await sendMessage(chatId, `${summary}\nПоровну:\n${lines.join("\n")}\n\nЗаписать ${deals.length} операции?`, [
    [
      { text: `✅ Записать ${deals.length}`, callback_data: `ln:yes:${row.id}` },
      { text: "✖ Отмена", callback_data: `ln:no:${row.id}` },
    ],
  ]);
}

async function handleLaundry(chatId: number, staff: Staff, text: string) {
  const parsed = parseAmount(text);
  if (!parsed) {
    await sendMessage(chatId, "Назовите сумму: например «стирка 6000 распредели».");
    return;
  }
  const refs = await loadRefs();
  const accountId = findAccounts(parsed.rest, refs.accounts)[0]?.id ?? staff.defaultCashAccountId;
  if (!accountId) {
    await sendMessage(chatId, "Укажите кассу: например «стирка 6000 распредели касса Ева».");
    return;
  }
  const totalKop = parseMoneyToKop(parsed.amount) ?? 0;
  const targets = await findLaundryTargets();
  if (targets.length === 0) {
    await sendMessage(chatId, "Нет краткосрочных заездов без стирки (выезд за последние 30 дней). Запишите стирку к конкретному заезду: «расход стирка 1500 заезд 34».");
    return;
  }
  const parts = splitEven(totalKop, targets.length);
  const lines = targets.map((t, i) => `№${t.number} ${t.assetName} · ${t.guestName.slice(0, 18)} (выезд ${ddmm(t.endDate)}) — ${formatKop(parts[i])}`);
  const shown = lines.length > 25 ? [...lines.slice(0, 25), `… и ещё ${lines.length - 25}`] : lines;
  await prisma.telegramDraft.deleteMany({ where: { chatId: BigInt(chatId), kind: "laundry" } });
  const input: LaundryDraft = { totalKop, accountId, dealIds: targets.map((t) => t.id), said: `Из Telegram: «${text}»` };
  const summary = `Стирка ${formatKop(totalKop)} → ${targets.length} брон. · касса ${refs.accounts.find((a) => a.id === accountId)?.name ?? "—"}`;
  const row = await prisma.telegramDraft.create({ data: { chatId: BigInt(chatId), kind: "laundry", input: input as unknown as object, summary } });
  await sendMessage(chatId, `${summary}
Поровну на заезды без стирки:
${shown.join("\n")}

Записать ${targets.length} операций? Перекосы потом можно поправить в журнале.`, [
    [
      { text: `✅ Записать ${targets.length}`, callback_data: `ln:yes:${row.id}` },
      { text: "✖ Отмена", callback_data: `ln:no:${row.id}` },
    ],
  ]);
}

async function handleLaundryCallback(chatId: number, messageId: number, cbId: string, action: string, draftId: string) {
  const row = await prisma.telegramDraft.findUnique({ where: { id: draftId } });
  if (!row || row.chatId !== BigInt(chatId) || row.kind !== "laundry") {
    await answerCallbackQuery(cbId, "Устарело — начните заново.");
    return;
  }
  if (action !== "yes") {
    await safeDeleteDraft(row.id);
    await editMessageText(chatId, messageId, `Отменено. ${row.summary}`);
    await answerCallbackQuery(cbId, "Отменено");
    return;
  }
  const staff = await findStaffByChat(chatId);
  if (!staff || !staff.active) {
    await answerCallbackQuery(cbId, "Сотрудник не найден.");
    return;
  }
  const d = row.input as unknown as LaundryDraft;
  try {
    const nums = await createLaundryOps({ ...d, date: new Date(`${todayIso()}T00:00:00Z`), createdBy: staff.name });
    await safeDeleteDraft(row.id);
    await editMessageText(chatId, messageId, `Записано ${nums.length} операций (№${nums[0]}–${nums[nums.length - 1]}). ${row.summary}`);
    await answerCallbackQuery(cbId, "Записано");
  } catch (e) {
    await answerCallbackQuery(cbId, "Ошибка");
    await sendMessage(chatId, `Не получилось записать: ${e instanceof Error ? e.message : "ошибка"}`);
  }
}

/** Кнопки карточки: выбор брони / статьи / кассы, «Записать», «Отмена». */
async function handleOpCallback(chatId: number, messageId: number, cbId: string, action: string, draftId: string, value: string | undefined) {
  const row = await prisma.telegramDraft.findUnique({ where: { id: draftId } });
  if (!row || row.chatId !== BigInt(chatId) || row.kind !== "op") {
    await answerCallbackQuery(cbId, "Карточка устарела — начните заново.");
    return;
  }
  const staff = await findStaffByChat(chatId);
  if (!staff || !staff.active) {
    await answerCallbackQuery(cbId, "Сотрудник не найден.");
    return;
  }
  const d = row.input as unknown as OpDraft;

  if (action === "no") {
    await safeDeleteDraft(row.id);
    await editMessageText(chatId, messageId, `Отменено.\n${row.summary}`);
    await answerCallbackQuery(cbId, "Отменено");
    return;
  }

  if (action === "yes") {
    const refs = await loadRefs();
    if (missingFields(d, refs).length > 0) {
      await answerCallbackQuery(cbId, "Карточка заполнена не полностью.");
      return;
    }
    const said = `Из Telegram: «${d.texts.filter(Boolean).join(" / ")}»`;
    const input: OperationInput = {
      date: d.date,
      type: d.type,
      amount: d.amount ?? "",
      accountId: d.accountId ?? "",
      toAccountId: d.toAccountId ?? "",
      categoryId: d.type === "TRANSFER" ? "" : (d.categoryId ?? ""),
      assetId: d.dealId ? "" : (d.assetId ?? ""),
      dealId: d.dealId ?? "",
      comment: (d.note ? `${d.note} · ${said}` : said).slice(0, 1000),
    };
    const res = await buildOperationData(input);
    if ("error" in res) {
      await answerCallbackQuery(cbId, "Ошибка");
      await sendMessage(chatId, `Не получилось записать: ${res.error}`);
      return;
    }
    const op = await prisma.operation.create({ data: { ...res.data, createdBy: staff.name } });
    await safeDeleteDraft(row.id);
    await editMessageText(chatId, messageId, `Записано, операция №${op.number}.\n${row.summary}`);
    await answerCallbackQuery(cbId, "Записано");
    return;
  }

  if (!value) {
    await answerCallbackQuery(cbId);
    return;
  }
  const patch: Partial<OpDraft> =
    action === "d" ? { dealId: value } : action === "c" ? { categoryId: value } : action === "a" ? { accountId: value } : action === "t" ? { toAccountId: value } : {};
  await answerCallbackQuery(cbId, "Принято");
  await editMessageText(chatId, messageId, row.summary).catch(() => undefined); // убрать кнопки со старой карточки
  await stepOp(chatId, staff, d, null, row.id, patch);
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

// ───────────── Новая бронь (квартира) ─────────────

async function loadBookingRefs() {
  const [assets, channels] = await Promise.all([
    prisma.asset.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, kind: true, aliases: true } }),
    prisma.channel.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, commissionLowPct: true, commissionHighPct: true } }),
  ]);
  return { assets, channels: channels.map((c): BChannel => ({ id: c.id, name: c.name, lowPct: c.commissionLowPct, highPct: c.commissionHighPct })) };
}

function bookingDealInput(d: BookingDraft, channels: BChannel[]): DealInput {
  const grossKop = parseMoneyToKop(d.amount ?? "") ?? 0;
  const comm = commissionKop(grossKop, channels.find((c) => c.id === d.channelId), d.start);
  return {
    assetId: d.assetId ?? "",
    channelId: d.channelId ?? "",
    guestName: d.guestName ?? "",
    phone: d.phone ?? "",
    startDate: d.start ?? "",
    endDate: d.end ?? "",
    gross: d.amount ?? "",
    commission: (comm / 100).toFixed(2),
    comment: `Из Telegram: «${d.texts.filter(Boolean).join(" / ")}»`.slice(0, 2000),
  };
}

/** Шаг карточки брони: дописать фразу или выбор кнопкой, показать карточку с одним вопросом или с кнопкой «Записать». */
async function stepBooking(chatId: number, base: BookingDraft, text: string | null, oldId: string | null, patch?: Partial<BookingDraft>) {
  const { assets, channels } = await loadBookingRefs();
  const notes: string[] = [];
  let d: BookingDraft = { ...base, ...patch };
  if (text !== null && text.trim()) {
    const r = applyBookingText(d, text, assets, channels, todayIso());
    d = r.draft;
    if (r.carNamed) notes.push("Машины через бота не бронируются: заведите бронь на шахматке «Машины» на сайте. Здесь — только квартиры.");
  }
  const missing = missingBookingFields(d);
  d.awaiting = missing[0];

  // всё названо — сразу проверяем, как при записи (пересечение с другой бронью, даты)
  let problem: string | null = null;
  if (missing.length === 0) {
    const res = await buildDealData(bookingDealInput(d, channels));
    if ("error" in res) problem = res.error;
  }

  if (oldId) await safeDeleteDraft(oldId);
  const grossKop = d.amount ? parseMoneyToKop(d.amount) : null;
  const card = renderBookingCard(d, assets, channels, formatKop, grossKop);
  const row = await prisma.telegramDraft.create({ data: { chatId: BigInt(chatId), kind: "bk", input: d as unknown as object, summary: card } });
  const cancel: InlineButton = { text: "✖ Отмена", callback_data: `bk:no:${row.id}` };
  const head = notes.length ? `${notes.join("\n")}\n\n` : "";

  if (missing.length === 0) {
    if (problem) {
      await sendMessage(chatId, `${head}${card}\n\n⚠ ${problem}\nСкажите другие даты или квартиру — карточка обновится.`, [[cancel]]);
      return;
    }
    await sendMessage(
      chatId,
      `${head}${card}\n\nВсё заполнено. Чтобы исправить — просто скажите исправление. Бронь появится на шахматке; в RealtyCalendar её тоже заведите — сверка свяжет их.`,
      [[{ text: "✅ Записать бронь", callback_data: `bk:yes:${row.id}` }, cancel]],
    );
    return;
  }

  const field = missing[0];
  const buttons: InlineButton[][] = [];
  if (field === "asset") {
    const apts = assets.filter((a) => a.kind === "APARTMENT");
    for (let i = 0; i < apts.length; i += 3) buttons.push(apts.slice(i, i + 3).map((a) => ({ text: a.name, callback_data: `bk:a:${row.id}:${a.id}` })));
  } else if (field === "channel") {
    for (let i = 0; i < channels.length; i += 2) buttons.push(channels.slice(i, i + 2).map((c) => ({ text: c.name, callback_data: `bk:c:${row.id}:${c.id}` })));
  }
  buttons.push([cancel]);
  await sendMessage(chatId, `${head}${card}\n\n${BOOKING_QUESTION[field]}`, buttons);
}

async function startBooking(chatId: number, text: string) {
  await prisma.telegramDraft.deleteMany({ where: { chatId: BigInt(chatId), kind: { in: ["op", "bk"] } } });
  await stepBooking(chatId, { texts: [] }, text, null);
}

async function handleBookingCallback(chatId: number, messageId: number, cbId: string, action: string, draftId: string, value: string | undefined) {
  const row = await prisma.telegramDraft.findUnique({ where: { id: draftId } });
  if (!row || row.chatId !== BigInt(chatId) || row.kind !== "bk") {
    await answerCallbackQuery(cbId, "Карточка устарела — начните заново.");
    return;
  }
  const staff = await findStaffByChat(chatId);
  if (!staff || !staff.active) {
    await answerCallbackQuery(cbId, "Сотрудник не найден.");
    return;
  }
  const d = row.input as unknown as BookingDraft;

  if (action === "no") {
    await safeDeleteDraft(row.id);
    await editMessageText(chatId, messageId, `Отменено.\n${row.summary}`);
    await answerCallbackQuery(cbId, "Отменено");
    return;
  }

  if (action === "yes") {
    if (missingBookingFields(d).length > 0) {
      await answerCallbackQuery(cbId, "Карточка заполнена не полностью.");
      return;
    }
    const { channels } = await loadBookingRefs();
    const res = await buildDealData(bookingDealInput(d, channels));
    if ("error" in res) {
      await answerCallbackQuery(cbId, "Ошибка");
      await sendMessage(chatId, `Не получилось записать: ${res.error}`);
      return;
    }
    const deal = await prisma.deal.create({ data: { ...res.data, createdBy: staff.name } });
    await safeDeleteDraft(row.id);
    await editMessageText(chatId, messageId, `Записано, бронь №${deal.number}. Она уже на шахматке.\n${row.summary}`);
    await answerCallbackQuery(cbId, "Записано");
    return;
  }

  if (!value) {
    await answerCallbackQuery(cbId);
    return;
  }
  const patch: Partial<BookingDraft> = action === "a" ? { assetId: value } : action === "c" ? { channelId: value } : {};
  await answerCallbackQuery(cbId, "Принято");
  await editMessageText(chatId, messageId, row.summary).catch(() => undefined);
  await stepBooking(chatId, d, null, row.id, patch);
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
  if (parts[0] === "ln") {
    const [, action, draftId] = parts;
    await handleLaundryCallback(chatId, messageId, cb.id, action, draftId);
    return;
  }
  if (parts[0] === "bk") {
    const [, action, draftId, value] = parts;
    await handleBookingCallback(chatId, messageId, cb.id, action, draftId, value);
    return;
  }
  if (parts[0] === "op") {
    const [, action, draftId, value] = parts;
    await handleOpCallback(chatId, messageId, cb.id, action, draftId, value);
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
