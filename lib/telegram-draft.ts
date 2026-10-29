/**
 * Карточка операции в Telegram-боте, которая заполняется за несколько сообщений (голосом или текстом).
 * Чистые функции без базы: разбор очередной фразы, список недостающего, текст карточки. Работа с базой — в telegram-bot.ts.
 *
 * Поток: «расход уборка рио 1500» → карточка: что понято ✅ и что не хватает ❓ + один вопрос →
 * сотрудник отвечает («34», «Иванов», «с карты х», «не 1500, а 1800») → карточка дополняется → «Записать».
 */

import { findAccounts, matchAsset, matchCategory, parseDealNumber, stripDealNumber, type PAccount, type PAsset, type PCategory } from "@/lib/telegram-parse";

export type OpType = "EXPENSE" | "INCOME" | "TRANSFER";
export type Binding = "deal" | "object" | "general";
export type Field = "amount" | "category" | "deal" | "object" | "note" | "account" | "to";

export type OpDraft = {
  type: OpType;
  date: string; // YYYY-MM-DD
  amount?: string; // рубли строкой, как в форме
  categoryId?: string;
  dealId?: string;
  assetId?: string;
  accountId?: string; // касса: откуда (расход, перемещение) или куда (приход)
  toAccountId?: string; // только перемещение
  note?: string; // пояснение для общего расхода
  texts: string[]; // всё, что сказал сотрудник, — уходит в комментарий операции
  awaiting?: Field;
};

export type DCategory = PCategory & { binding: string | null };
export type Refs = { accounts: PAccount[]; categories: DCategory[]; assets: PAsset[] };

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();

/** Слово-намерение в начале фразы. null — не начало новой операции (возможно, ответ на вопрос карточки). */
export function detectIntent(text: string): OpType | null {
  const first = norm(text).split(" ")[0] ?? "";
  if (/^(расход|потратил|потратила|заплатил|заплатила|оплатил|оплатила|купил|купила)/.test(first)) return "EXPENSE";
  if (/^(оплата|приход|получил|получила|пришл|поступ)/.test(first)) return "INCOME";
  // «перевод» сюда не входит: «перевод 5000 бронь 52» чаще значит оплату от гостя
  if (/^(передал|передала|перевел|перевела|перекинул|переложил|сдал|сдала|перемещ)/.test(first)) return "TRANSFER";
  return null;
}

export const dropIntentWord = (text: string) => text.trim().replace(/^\S+\s*/, "");

/** Все числа фразы (пробелы внутри числа допускаются: «15 000»). */
function numbers(text: string): string[] {
  return [...text.matchAll(/\d[\d\s]*(?:[.,]\d{1,2})?/g)].map((m) => m[0].replace(/\s/g, "").replace(",", ".")).filter((n) => Number(n) > 0);
}

const addDaysIso = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

export type ApplyResult = {
  draft: OpDraft;
  /** Номер брони, названный во фразе, — найти в базе. */
  dealNo?: number;
  /** Слова для поиска брони по гостю, если на вопрос «какой заезд» ответили именем. */
  guestQuery?: string;
};

/**
 * Дописывает в карточку то, что удалось понять из очередной фразы. Новые значения заменяют старые — так работают
 * исправления: «не 1500, а 1800», «касса карта х», «это стирка».
 */
export function applyText(prev: OpDraft, rawText: string, refs: Refs, today: string, dealAssetKind?: "APARTMENT" | "CAR"): ApplyResult {
  const d: OpDraft = { ...prev, texts: [...prev.texts, rawText.trim()] };
  const res: ApplyResult = { draft: d };
  const text = rawText.trim();
  const t = norm(text);

  if (prev.awaiting === "note") {
    d.note = text;
    return res;
  }

  if (/(^|\s)вчера(\s|$)/.test(t)) d.date = addDaysIso(today, -1);
  if (/(^|\s)позавчера(\s|$)/.test(t)) d.date = addDaysIso(today, -2);

  // номер брони: «заезд 34», «№34»; а если ждём заезд — достаточно голого числа
  let rest = text;
  const dn = parseDealNumber(text);
  if (dn !== null) {
    res.dealNo = dn;
    rest = stripDealNumber(text);
  } else if (prev.awaiting === "deal") {
    const nums = numbers(text);
    const onlyNumber = /^\D*\d{1,6}\D*$/.test(text) && !/(руб|тыс|₽)/.test(t);
    if (nums.length === 1 && onlyNumber) {
      res.dealNo = Number(nums[0]);
      rest = "";
    }
  }

  // сумма: при исправлении «не 1500, а 1800» берём последнее число
  const nums = numbers(rest);
  if (nums.length > 0) d.amount = /(^|\s)не\s/.test(t) && nums.length > 1 ? nums[nums.length - 1] : nums[0];

  // кассы
  const accs = findAccounts(rest, refs.accounts);
  if (d.type === "TRANSFER") {
    if (accs.length >= 2) {
      d.accountId = accs[0].id;
      d.toAccountId = accs[1].id;
    } else if (accs.length === 1) {
      // одна касса: «из/с кассы Ева» — откуда; иначе «куда» (откуда — касса сотрудника), кроме ответа на вопрос «из какой кассы»
      const saidFrom = /(^|\s)(из|с|со)\s+(касс|карт|рубин|монет|амр|нал)/.test(norm(rest));
      if (prev.awaiting === "account" || (saidFrom && prev.awaiting !== "to")) d.accountId = accs[0].id;
      else d.toAccountId = accs[0].id;
    }
  } else if (accs.length > 0) {
    d.accountId = accs[0].id;
  }

  // объект и статья
  if (d.type !== "TRANSFER") {
    const asset = matchAsset(rest, refs.assets);
    if (asset) d.assetId = asset.id;
    const kindForCat = dealAssetKind ?? refs.assets.find((a) => a.id === d.assetId)?.kind;
    const cat = matchCategory(rest, refs.categories, d.type, kindForCat);
    if (cat) d.categoryId = cat.id;
  }

  // ответ именем гостя на вопрос «какой заезд»
  if (prev.awaiting === "deal" && res.dealNo === undefined) {
    const q = t.replace(/[^a-zа-я0-9 ]/gi, " ").split(" ").filter((w) => w.length >= 3 && !/^(заезд|бронь|гост|это|для|от)/.test(w));
    if (q.length > 0) res.guestQuery = q.join(" ");
  }

  // ответ на вопрос «на что общий расход» мог прийти в одной фразе со статьёй — пояснение берём, только когда его спрашивали
  return res;
}

export function bindingOf(d: OpDraft, refs: Refs): Binding | null {
  const c = refs.categories.find((x) => x.id === d.categoryId);
  const b = c?.binding;
  return b === "deal" || b === "object" || b === "general" ? b : null;
}

/** Чего не хватает, в порядке вопросов. Приход всегда к заезду. */
export function missingFields(d: OpDraft, refs: Refs): Field[] {
  const m: Field[] = [];
  if (!d.amount) m.push("amount");
  if (d.type === "TRANSFER") {
    if (!d.accountId) m.push("account");
    if (!d.toAccountId) m.push("to");
    return m;
  }
  if (d.type === "INCOME") {
    if (!d.dealId) m.push("deal");
    if (!d.categoryId) m.push("category");
  } else {
    if (!d.categoryId) m.push("category");
    const b = bindingOf(d, refs);
    if (b === "deal" && !d.dealId) m.push("deal");
    if (b === "object" && !d.dealId && !d.assetId) m.push("object");
    if ((b === "general" || (!b && !d.dealId && !d.assetId && d.categoryId)) && (d.note ?? "").trim().length < 5) m.push("note");
  }
  if (!d.accountId) m.push("account");
  return m;
}

export const QUESTION: Record<Field, string> = {
  amount: "Какая сумма?",
  category: "За что? Назовите статью (уборка, стирка, бензин, ремонт…) или выберите кнопкой.",
  deal: "К какому заезду? Назовите номер брони или фамилию гостя, или выберите кнопкой.",
  object: "К какому объекту? Назовите квартиру или машину.",
  note: "Это общий расход. Коротко скажите, на что он (например «интернет офиса за октябрь»).",
  account: "Из какой кассы? (касса Ева, карта Х, Амра…)",
  to: "В какую кассу? (Рубин, карта Х, касса Ева…)",
};

export type CardDeal = { number: number; guestName: string; assetName: string; start: string; end: string };

/** Текст карточки: что заполнено ✅, чего нет ❓. */
export function renderCard(d: OpDraft, refs: Refs, deal: CardDeal | null, money: (rub: string) => string): string {
  const acc = (id?: string) => refs.accounts.find((a) => a.id === id)?.name;
  const cat = refs.categories.find((c) => c.id === d.categoryId)?.name;
  const asset = refs.assets.find((a) => a.id === d.assetId)?.name;
  const ok = (v: string | undefined, label: string) => (v ? `✅ ${label}: ${v}` : `❓ ${label}`);
  const title = d.type === "EXPENSE" ? "Расход" : d.type === "INCOME" ? "Приход" : "Перемещение";
  const lines = [`${title} · ${d.date.split("-").reverse().join(".")}`, ok(d.amount ? money(d.amount) : undefined, "Сумма")];
  if (d.type === "TRANSFER") {
    lines.push(ok(acc(d.accountId), "Из кассы"), ok(acc(d.toAccountId), "В кассу"));
    return lines.join("\n");
  }
  lines.push(ok(cat, "Статья"));
  const b = bindingOf(d, refs);
  if (deal) lines.push(`✅ Заезд: №${deal.number} · ${deal.assetName} · ${deal.guestName} (${deal.start}–${deal.end})`);
  else if (d.type === "INCOME" || b === "deal") lines.push("❓ Заезд");
  else if (asset) lines.push(`✅ Объект: ${asset}`);
  else if (b === "object") lines.push("❓ Объект");
  if (!deal && !asset && (b === "general" || (d.type === "EXPENSE" && b === null))) lines.push(ok(d.note, "На что (общий расход)"));
  lines.push(ok(acc(d.accountId), d.type === "INCOME" ? "Касса (куда пришло)" : "Касса"));
  return lines.join("\n");
}
