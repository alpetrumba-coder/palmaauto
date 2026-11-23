/**
 * Ремонт Акиртава в Telegram-боте: прораб наговаривает покупки вне Рубина, оплату работ и гонорар.
 *  «Акиртава, купил клей для плитки 3 мешка 1950, Стройдвор, с карты Х»
 *  «Акиртава, заплатил плиточнику 20 000 за укладку в санузле, из кассы Евы»
 *  «Акиртава, взял гонорар 50 000 из кассы Евы»
 * Бот показывает карточку: сумма, касса, дата, строка сметы (или «вне сметы»); после «Записать» — накладная ремонта
 * и расход в журнале. Фото чека/накладной прикрепляется к последней записи (или к накладной УНФ по номеру в подписи).
 */
import { fmtDate } from "@/lib/accounting-options";
import { futureDateError } from "@/lib/operation-build";
import { formatKop } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import {
  createRepairDoc,
  ensureRepairSeed,
  FEE_LINE_NO,
  KIND_LABEL,
  loadEstimate,
  matchEstimate,
  notifyOwners,
  offEstimateText,
  REPAIR_PROJECT,
  type EstimateItem,
} from "@/lib/repair";
import { answerCallbackQuery, downloadFile, editMessageText, getFile, sendMessage, type InlineButton } from "@/lib/telegram";
import { findAccounts, parseOpDate } from "@/lib/telegram-parse";

type Staff = { id: string; name: string; role: "OWNER" | "OPERATOR" };
type RepairKind = "goods" | "work" | "fee";
type RepairDraft = {
  kind: RepairKind;
  amountKop: number | null;
  accountId: string | null;
  date: string;
  text: string;
  estimateItemId: string | null;
  candidates: string[];
  chosen: boolean;
  photo?: { fileId: string; name: string; mime: string } | null;
};

const lc = (s: string) => s.toLowerCase().replace(/ё/g, "е");

export function isRepairIntent(text: string): boolean {
  const t = lc(text);
  return /(акирт|акерт|киртав|кертав)/.test(t) || /(^|\s)гонорар/.test(t);
}

function kindOf(text: string): RepairKind {
  const t = lc(text);
  if (/гонорар/.test(t)) return "fee";
  const work = /(заплатил|оплатил|оплата|за работ|работ[уы]|рабоч|мастер|плиточ|электрик|сантехник|маляр|штукатур|за укладк|за монтаж|бригад|аванс)/.test(t);
  const buy = /(купил|покупк|взял товар|материал)/.test(t);
  return work && !buy ? "work" : "goods";
}

/** Сумма — самое большое число во фразе (количество и размеры обычно меньше); «20 тысяч», «20 000», «1950,50». */
export function parseRepairAmountKop(text: string): number | null {
  const t = lc(text).replace(/(акирт|акерт|киртав|кертав)[а-я]*\s*(27)?/g, " ");
  let best: number | null = null;
  for (const m of t.matchAll(/(\d{1,3}(?:[  ]\d{3})+|\d+)(?:[.,](\d{1,2}))?(?:\s*(тысяч[а-я]*|тыс\.?|т(?=[\s.,]|$)|к(?=[\s.,]|$)))?/g)) {
    const int = Number(m[1].replace(/[  ]/g, ""));
    if (!Number.isFinite(int)) continue;
    let rub = int + (m[2] ? Number(m[2].padEnd(2, "0")) / 100 : 0);
    if (m[3]) rub *= 1000;
    if (best === null || rub > best) best = rub;
  }
  return best === null || best <= 0 ? null : Math.round(best * 100);
}

function todayIso(): string {
  const msk = new Date(Date.now() + 3 * 3600000);
  return msk.toISOString().slice(0, 10);
}

function parseDate(text: string): { date: string; rest: string } {
  const today = todayIso();
  const t = lc(text);
  const shift = (days: number) => new Date(Date.parse(`${today}T00:00:00Z`) - days * 86400000).toISOString().slice(0, 10);
  if (/позавчера/.test(t)) return { date: shift(2), rest: text.replace(/позавчера/i, " ") };
  if (/вчера/.test(t)) return { date: shift(1), rest: text.replace(/вчера/i, " ") };
  const d = parseOpDate(text, today);
  return d ?? { date: today, rest: text };
}

async function accounts() {
  return prisma.cashAccount.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
}

function itemTitle(i: EstimateItem): string {
  return i.kind === "fee" ? "Гонорар прораба" : `${i.name} (${i.section})`;
}

async function renderCard(d: RepairDraft): Promise<string> {
  const items = await loadEstimate();
  const acc = d.accountId ? await prisma.cashAccount.findUnique({ where: { id: d.accountId }, select: { name: true } }) : null;
  const it = d.estimateItemId ? items.find((i) => i.id === d.estimateItemId) : null;
  return [
    `Ремонт Акиртава — ${KIND_LABEL[d.kind]}`,
    `Сумма: ${d.amountKop ? formatKop(d.amountKop) : "❓ не назвали"}`,
    `Касса: ${acc?.name ?? "❓ не указана"}`,
    `Дата: ${fmtDate(new Date(`${d.date}T00:00:00Z`))}`,
    `Смета: ${it ? itemTitle(it) : "вне сметы ⚠ (владельцу придёт уведомление)"}`,
    d.photo ? "Фото: прикреплю после записи" : "",
    `Сказано: «${d.text}»`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function showCard(chatId: number, d: RepairDraft, oldDraftId: string | null) {
  if (oldDraftId) await prisma.telegramDraft.deleteMany({ where: { id: oldDraftId } });
  const card = await renderCard(d);
  const row = await prisma.telegramDraft.create({ data: { chatId: BigInt(chatId), kind: "rp", input: d as unknown as object, summary: card } });
  const items = await loadEstimate();
  const buttons: InlineButton[][] = [];
  for (const id of d.candidates) {
    if (id === d.estimateItemId) continue;
    const it = items.find((i) => i.id === id);
    if (it) buttons.push([{ text: `↪ ${it.name.slice(0, 40)}`, callback_data: `rp:e:${row.id}:${id}` }]);
  }
  if (d.estimateItemId && d.kind !== "fee") buttons.push([{ text: "Нет в смете", callback_data: `rp:x:${row.id}` }]);
  let question = "";
  if (!d.amountKop) {
    question = "Назовите сумму (например «1950») — или скажите фразу заново.";
  } else if (!d.accountId) {
    question = "С какой кассы платили?";
    const accs = (await accounts()).filter((a) => a.name !== "Касса Гумистинская");
    for (let i = 0; i < accs.length; i += 2) buttons.push(accs.slice(i, i + 2).map((a) => ({ text: a.name, callback_data: `rp:a:${row.id}:${a.id}` })));
  } else {
    buttons.push([{ text: "✅ Записать", callback_data: `rp:yes:${row.id}` }]);
  }
  buttons.push([{ text: "✖ Отмена", callback_data: `rp:no:${row.id}` }]);
  await sendMessage(chatId, question ? `${card}\n\n${question}` : `${card}\n\nВсё верно? Если смета не та — выберите кнопкой ниже.`, buttons);
}

/** Новая карточка ремонта из фразы (или подписи к фото). */
export async function startRepair(chatId: number, staff: Staff, text: string, photo?: RepairDraft["photo"]) {
  await ensureRepairSeed();
  await prisma.telegramDraft.deleteMany({ where: { chatId: BigInt(chatId), kind: { in: ["rp", "op", "bk"] } } });
  const { date, rest } = parseDate(text);
  const kind = kindOf(rest);
  const items = await loadEstimate();
  const acc = findAccounts(rest, await accounts())[0];
  let candidates: string[] = [];
  if (kind === "fee") {
    const fee = items.find((i) => i.lineNo === FEE_LINE_NO);
    if (fee) candidates = [fee.id];
  } else {
    const ms = matchEstimate(rest, items, kind === "work" ? "work" : "material");
    candidates = (ms.length ? ms : matchEstimate(rest, items, null)).slice(0, 3).map((m) => m.item.id);
  }
  const d: RepairDraft = {
    kind,
    amountKop: parseRepairAmountKop(rest),
    accountId: acc?.id ?? null,
    date,
    text: text.trim().slice(0, 400),
    estimateItemId: candidates[0] ?? null,
    candidates,
    chosen: kind === "fee",
    photo: photo ?? null,
  };
  await showCard(chatId, d, null);
}

/** Ответ на вопрос открытой карточки ремонта (сумма). true — фраза обработана. */
export async function continueRepair(chatId: number, text: string): Promise<boolean> {
  const row = await prisma.telegramDraft.findFirst({ where: { chatId: BigInt(chatId), kind: "rp" }, orderBy: { createdAt: "desc" } });
  if (!row || Date.now() - row.createdAt.getTime() > 30 * 60 * 1000) return false;
  const d = row.input as unknown as RepairDraft;
  if (d.amountKop) return false;
  const amount = parseRepairAmountKop(text);
  if (!amount) return false;
  const acc = findAccounts(text, await accounts())[0];
  await showCard(chatId, { ...d, amountKop: amount, accountId: d.accountId ?? acc?.id ?? null }, row.id);
  return true;
}

async function attachTelegramFile(docId: string | null, photo: NonNullable<RepairDraft["photo"]>, caption: string | null, by: string) {
  const { file_path, file_size } = await getFile(photo.fileId);
  if (file_size && file_size > 15 * 1024 * 1024) throw new Error("Файл больше 15 МБ.");
  const data = await downloadFile(file_path);
  await prisma.repairFile.create({ data: { docId, name: photo.name, mime: photo.mime, data: new Uint8Array(data), caption, createdBy: by } });
}

export async function handleRepairCallback(chatId: number, messageId: number, cbId: string, action: string, draftId: string, value: string | undefined, staff: Staff | null) {
  const row = await prisma.telegramDraft.findUnique({ where: { id: draftId } });
  if (!row || !staff) {
    await answerCallbackQuery(cbId, "Карточка устарела — скажите заново.");
    return;
  }
  const d = row.input as unknown as RepairDraft;
  if (action === "no") {
    await prisma.telegramDraft.deleteMany({ where: { id: draftId } });
    await answerCallbackQuery(cbId, "Отменено");
    await editMessageText(chatId, messageId, `${row.summary}\n\n✖ Отменено.`).catch(() => undefined);
    return;
  }
  if (action === "e" || action === "x" || action === "a") {
    const patch: Partial<RepairDraft> = action === "e" ? { estimateItemId: value ?? null, chosen: true } : action === "x" ? { estimateItemId: null, chosen: true } : { accountId: value ?? null };
    await answerCallbackQuery(cbId, "Принято");
    await editMessageText(chatId, messageId, row.summary).catch(() => undefined);
    await showCard(chatId, { ...d, ...patch }, row.id);
    return;
  }
  if (action !== "yes") {
    await answerCallbackQuery(cbId);
    return;
  }
  // запись: забираем карточку атомарно (двойное нажатие)
  const claimed = await prisma.telegramDraft.deleteMany({ where: { id: draftId } });
  if (claimed.count !== 1) {
    await answerCallbackQuery(cbId, "Уже записано.");
    return;
  }
  const fail = async (msg: string) => {
    await answerCallbackQuery(cbId, "Не записано");
    await sendMessage(chatId, `Не записал: ${msg}`);
  };
  if (!d.amountKop || !d.accountId) return fail("нет суммы или кассы.");
  const date = new Date(`${d.date}T00:00:00Z`);
  const future = futureDateError(date);
  if (future) return fail(future);
  try {
    const r = await createRepairDoc({
      source: "bot",
      date,
      kind: d.kind,
      destination: "akirtava",
      accountId: d.accountId,
      comment: `Из Telegram (${staff.name}): «${d.text}»`,
      lines: [{ name: d.text, sumKop: d.amountKop, estimateItemId: d.estimateItemId, matchMode: d.kind === "fee" ? "fee" : d.estimateItemId ? (d.chosen ? "manual" : "name") : "none" }],
      createdBy: staff.name,
    });
    await answerCallbackQuery(cbId, "Записано");
    await editMessageText(chatId, messageId, `${row.summary}\n\n✅ Записано: журнал №${r.opNumber}.`).catch(() => undefined);
    let photoNote = "Пришлите фото чека — прикреплю к этой записи.";
    if (d.photo) {
      try {
        await attachTelegramFile(r.docId, d.photo, d.text, staff.name);
        photoNote = "Фото прикреплено.";
      } catch (e) {
        photoNote = `Фото не сохранилось (${e instanceof Error ? e.message : e}) — пришлите ещё раз.`;
      }
    }
    await sendMessage(chatId, `Записал в ремонт Акиртава, журнал №${r.opNumber}. ${photoNote}`);
    if (!d.estimateItemId && staff.role !== "OWNER") {
      await notifyOwners(offEstimateText(`${KIND_LABEL[d.kind]} ${formatKop(d.amountKop)}, ${fmtDate(date)}, журнал №${r.opNumber}`, [{ name: d.text, sumKop: d.amountKop }], staff.name));
    }
  } catch (e) {
    console.error("[telegram-repair]", e);
    await fail(e instanceof Error ? e.message : String(e));
  }
}

/**
 * Фото/файл в чате. С подписью про Акиртаву и суммой — новая карточка (фото прикрепится после записи).
 * Иначе: номер накладной в подписи → к накладной УНФ; без номера — к последней записи этого сотрудника за 6 часов.
 */
export async function handleRepairPhoto(chatId: number, staff: Staff, photo: NonNullable<RepairDraft["photo"]>, caption: string | null) {
  await ensureRepairSeed();
  if (caption && isRepairIntent(caption) && parseRepairAmountKop(caption)) {
    await startRepair(chatId, staff, caption, photo);
    return;
  }
  let doc: { id: string; number: string | null; date: Date; totalKop: number } | null = null;
  const digits = caption?.match(/\d{4,6}/)?.[0];
  if (digits) {
    const cands = await prisma.repairDoc.findMany({ where: { project: REPAIR_PROJECT, number: { contains: digits } }, orderBy: { date: "desc" }, take: 5, select: { id: true, number: true, date: true, totalKop: true } });
    doc = cands.find((c) => (c.number ?? "").replace(/\D/g, "").replace(/^0+/, "").endsWith(digits.replace(/^0+/, ""))) ?? null;
  }
  if (!doc && !digits) {
    doc = await prisma.repairDoc.findFirst({
      where: { project: REPAIR_PROJECT, createdBy: staff.name, createdAt: { gte: new Date(Date.now() - 6 * 3600000) } },
      orderBy: { createdAt: "desc" },
      select: { id: true, number: true, date: true, totalKop: true },
    });
  }
  try {
    await attachTelegramFile(doc?.id ?? null, photo, caption, staff.name);
  } catch (e) {
    await sendMessage(chatId, `Не удалось сохранить фото: ${e instanceof Error ? e.message : e}`);
    return;
  }
  if (doc) {
    await sendMessage(chatId, `Фото прикрепил к ${doc.number ? `накладной ${doc.number}` : "записи"} от ${fmtDate(doc.date)} на ${formatKop(doc.totalKop)}.`);
  } else if (digits) {
    await sendMessage(chatId, `Фото сохранил, но накладную №${digits} пока не нашёл — она придёт из УНФ, тогда владелец её привяжет. Если это покупка вне Рубина — скажите «Акиртава, что купил, сумма, касса».`);
  } else {
    await sendMessage(chatId, "Фото сохранил. Чтобы прикрепить к накладной из Рубина — пришлите его с номером накладной в подписи. Если это покупка — скажите «Акиртава, что купил, сумма, касса».");
  }
}

export const REPAIR_HELP =
  "• Акиртава, купил клей 3 мешка 1950, Стройдвор, с карты Х — покупка на ремонт\n" +
  "• Акиртава, заплатил плиточнику 20000 за укладку, из кассы Евы — оплата работ\n" +
  "• Акиртава, взял гонорар 50000 из кассы Евы — гонорар прораба\n" +
  "• фото чека или накладной — прикреплю (номер накладной Рубина — в подписи)";
