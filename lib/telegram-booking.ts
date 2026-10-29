/**
 * Карточка «Новая бронь» (квартира) в Telegram-боте. Чистые функции без базы: разбор фразы, недостающие поля, текст карточки.
 * Работа с базой и запись — в telegram-bot.ts (через тот же buildDealData, что и форма на шахматке).
 *
 * «Новая бронь Рио с 5 по 10 ноября Иванов 25000 Авито» → карточка ✅/❓ → бот спрашивает недостающее → «Записать».
 * Машины так не заводятся: у брони машины должен быть клиент сайта — её заводят на шахматке «Машины».
 */

import { matchAsset, type PAsset } from "@/lib/telegram-parse";

export type BookingField = "asset" | "dates" | "guest" | "amount" | "channel";
export type BChannel = { id: string; name: string; lowPct: number; highPct: number };

export type BookingDraft = {
  assetId?: string;
  start?: string; // YYYY-MM-DD
  end?: string;
  guestName?: string;
  phone?: string;
  amount?: string; // рубли строкой
  channelId?: string;
  texts: string[];
  awaiting?: BookingField;
};

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/[«»"',;:!?()]/g, " ").replace(/\s+/g, " ").trim();

/** Фраза начинает новую бронь: «новая бронь…», «новый заезд…», «забронировала…», «бронь Рио…» (но не «бронь 52» — это номер). */
export function isBookingIntent(text: string): boolean {
  const t = norm(text);
  return /^(нов[а-я]* (брон|заезд)|забронир|бронирую|(бронь|бронирование) (?!№|\d))/.test(t);
}

const MONTHS: [RegExp, number][] = [
  [/^январ/, 1], [/^феврал/, 2], [/^март/, 3], [/^апрел/, 4], [/^ма[йя]/, 5], [/^июн/, 6],
  [/^июл/, 7], [/^август/, 8], [/^сентябр/, 9], [/^октябр/, 10], [/^ноябр/, 11], [/^декабр/, 12],
];
const MONTH_RE = "(январ[а-я]*|феврал[а-я]*|март[а-я]*|апрел[а-я]*|ма[йя]|июн[а-я]*|июл[а-я]*|август[а-я]*|сентябр[а-я]*|октябр[а-я]*|ноябр[а-я]*|декабр[а-я]*)";
const monthNo = (w: string) => MONTHS.find(([re]) => re.test(w))?.[1] ?? 0;

const pad = (n: number) => String(n).padStart(2, "0");
const DAY = 86400000;
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const validDay = (y: number, m: number, d: number) => m >= 1 && m <= 12 && d >= 1 && new Date(Date.UTC(y, m - 1, d)).getUTCDate() === d;
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/** Год не называют: берём ближайший, при котором заезд не раньше чем 2 месяца назад. Выезд раньше заезда — следующий год. */
function withYears(today: string, sm: number, sd: number, em: number, ed: number): { start: string; end: string } | null {
  let y = Number(today.slice(0, 4));
  if (Date.parse(`${isoOf(y, sm, Math.min(sd, 28))}T00:00:00Z`) < Date.parse(`${today}T00:00:00Z`) - 60 * DAY) y += 1;
  const ey = em < sm || (em === sm && ed < sd) ? y + 1 : y;
  if (!validDay(y, sm, sd) || !validDay(ey, em, ed)) return null;
  return { start: isoOf(y, sm, sd), end: isoOf(ey, em, ed) };
}

// Голосом даты иногда приходят словами: «с пятого по десятое», «двадцать восьмого»
const ORDINALS: [string, number][] = [
  ["одиннадцат", 11], ["двенадцат", 12], ["тринадцат", 13], ["четырнадцат", 14], ["пятнадцат", 15], ["шестнадцат", 16], ["семнадцат", 17],
  ["восемнадцат", 18], ["девятнадцат", 19], ["двадцат", 20], ["тридцат", 30], ["перв", 1], ["втор", 2], ["трет", 3], ["четверт", 4],
  ["пят", 5], ["шест", 6], ["седьм", 7], ["восьм", 8], ["девят", 9], ["десят", 10],
];
const ORD_RE = new RegExp(`(^|\\s)(?:(двадцать|тридцать)\\s+)?(${ORDINALS.map((o) => o[0]).join("|")})(?:ьего|ого|его|ое|ье|ий|ой|ым|ья)(?=\\s|$)`, "g");
function ordinalsToDigits(t: string): string {
  return t.replace(ORD_RE, (_m, sp: string, tens: string | undefined, stem: string) => {
    const n = (tens === "двадцать" ? 20 : tens === "тридцать" ? 30 : 0) + (ORDINALS.find((o) => o[0] === stem)?.[1] ?? 0);
    return `${sp}${n}`;
  });
}

/** Даты: «с 5 по 10 ноября», «с 28 октября по 3 ноября», «5.11–10.11», «с 5 ноября на 3 ночи». Возвращает даты и фразу без них. */
export function parseDates(text: string, today: string): { start: string; end: string; rest: string } | null {
  const t = ordinalsToDigits(norm(text));
  const cut = (m: RegExpMatchArray) => `${t.slice(0, m.index)} ${t.slice((m.index ?? 0) + m[0].length)}`.replace(/\s+/g, " ").trim();
  // «с 5 по 10 ноября», «с 28 октября по 3 ноября», «5 - 10 ноября»
  let m = t.match(new RegExp(`(?:^|\\s)(?:с\\s+)?(\\d{1,2})(?:\\s+${MONTH_RE})?\\s*(?:по|до|-|—|–)\\s*(\\d{1,2})\\s+${MONTH_RE}`));
  if (m) {
    const em = monthNo(m[4]);
    const r = withYears(today, m[2] ? monthNo(m[2]) : em, Number(m[1]), em, Number(m[3]));
    if (r) return { ...r, rest: cut(m) };
  }
  // «5.11–10.11», «с 05.11.2026 по 10.11.2026»
  m = t.match(/(?:^|\s)(?:с\s+)?(\d{1,2})[./](\d{1,2})(?:[./]\d{2,4})?\s*(?:по|до|-|—|–)\s*(\d{1,2})[./](\d{1,2})(?:[./]\d{2,4})?/);
  if (m) {
    const r = withYears(today, Number(m[2]), Number(m[1]), Number(m[4]), Number(m[3]));
    if (r) return { ...r, rest: cut(m) };
  }
  // «с 5 ноября на 3 ночи», «5.11 на 3 суток»
  m = t.match(new RegExp(`(?:^|\\s)(?:с\\s+)?(\\d{1,2})(?:\\s+${MONTH_RE}|[./](\\d{1,2}))\\s+(?:на\\s+)?(\\d{1,3})\\s+(?:ноч|сут)[а-я]*`));
  if (m) {
    const sm = m[2] ? monthNo(m[2]) : Number(m[3]);
    const r = withYears(today, sm, Number(m[1]), sm, Number(m[1]));
    if (r && Number(m[4]) > 0) return { start: r.start, end: addDays(r.start, Number(m[4])), rest: cut(m) };
  }
  return null;
}

/** Телефон: «+7 940 123-45-67», «8 940 1234567» или цифры после слова «телефон». */
export function parsePhone(text: string): { phone: string; rest: string } | null {
  const m =
    text.match(/(?:телефон|тел\.?)\s*:?\s*(\+?[\d\s\-()]{7,20}\d)/i) ?? text.match(/(?:^|\s)((?:\+7|8|7)[\s\-()]*9\d{2}(?:[\s\-()]*\d){7})(?=\s|$)/);
  if (!m || m.index === undefined) return null;
  const digits = m[1].replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  const phone = m[1].trim().startsWith("+") ? `+${digits}` : digits;
  return { phone, rest: `${text.slice(0, m.index)} ${text.slice(m.index + m[0].length)}`.replace(/\s+/g, " ").trim() };
}

/** Сумма брони: число не меньше 100 («25000», «25 000», «25 тысяч»), не ночи и не гости. */
export function parseBookingAmount(text: string): { amount: string; rest: string } | null {
  for (const m of text.matchAll(/(\d[\d\s]*(?:[.,]\d{1,2})?)(\s*(?:тыс[а-я]*|к)(?=\s|$))?(\s+(?:ноч|сут|чел|взросл|дет|гост)[а-я]*)?/gi)) {
    if (m[3] || m.index === undefined) continue;
    let n = Number(m[1].replace(/\s/g, "").replace(",", "."));
    if (m[2]) n *= 1000;
    if (!(n >= 100)) continue;
    return { amount: String(Math.round(n * 100) / 100), rest: `${text.slice(0, m.index)} ${text.slice(m.index + m[0].length)}`.replace(/\s+/g, " ").trim() };
  }
  return null;
}

const CHANNEL_WORDS: { re: RegExp; name: string }[] = [
  { re: /(^|\s)(прям[а-я]*|напрям[а-я]*|без площад[а-я]*|сами|свой|свои|наш[а-я]*)(\s|$)/, name: "Прямые бронирования" },
  { re: /островок/, name: "Островок" },
  { re: /(^|\s)суточно/, name: "Суточно" },
  { re: /привет/, name: "ПриветТур" },
  { re: /форент/, name: "Форенто" },
  { re: /(^|\s)(твил|tvil)/, name: "Твил" },
  { re: /яндекс/, name: "Яндекс Путешествия" },
  { re: /авито|avito/, name: "Авито" },
];

export function matchChannel(text: string, channels: BChannel[]): BChannel | null {
  const t = norm(text);
  for (const w of CHANNEL_WORDS) {
    if (!w.re.test(t)) continue;
    const ch = channels.find((c) => c.name === w.name);
    if (ch) return ch;
  }
  return channels.find((c) => norm(c.name).length >= 4 && t.includes(norm(c.name))) ?? null;
}

// слова, которые не могут быть именем гостя
const STOP = new Set(
  ("с по до на за в во и а не от для через бронь брони бронирование новая новый новую заезд заезда забронировала забронировал забронируй бронирую " +
    "гость гостя гости имя зовут сумма сумму стоимость руб рубль рублей рубля р ₽ тыс тысяч тысячи ночи ночей ночь суток сутки " +
    "телефон тел площадка площадки через комиссия квартира квартиру квартире объект числа число года год " +
    "прямая прямые прямое напрямую без площадки сами свой свои наш наши").split(" "),
);

/** Начало слова для сравнения падежей: «Муха» / «Муху», «Рио», «Дольче Вита» / «Дольче Виту». */
const stemOf = (w: string) => (w.length <= 4 ? w.slice(0, Math.max(3, w.length - 1)) : w.slice(0, 5));
const nameWords = (a: PAsset) => norm(a.name).split(" ").filter((w) => w.length >= 3);

/** Квартира по фразе: точное название (matchAsset), иначе по началу слов названия — «Муху», «в Дольче Виту». */
export function matchApartment(text: string, assets: PAsset[]): PAsset | null {
  const exact = matchAsset(text, assets);
  if (exact) return exact;
  const ws = norm(text).split(" ");
  const hits = assets.filter((a) => a.kind === "APARTMENT" && nameWords(a).length > 0 && nameWords(a).every((nw) => ws.some((w) => w.startsWith(stemOf(nw)))));
  return hits.sort((a, b) => b.name.length - a.name.length)[0] ?? null;
}

function guessGuest(rest: string, asset: PAsset | undefined): string | undefined {
  let t = norm(rest).replace(/[\d+\-–—./₽]/g, " ");
  // явное «гость Иванов», «на имя Иванова», «зовут Анна»
  const explicit = t.match(/(?:гость|гостя|на имя|зовут|имя)\s+(.+)$/);
  if (explicit) t = explicit[1];
  const assetWords = new Set(asset ? norm([asset.name, ...(asset.aliases ?? "").split(/[\n;]/)].join(" ")).split(" ") : []);
  const assetStems = asset ? nameWords(asset).map(stemOf) : [];
  const ws = t.split(" ").filter((w) => w.length >= 2 && !STOP.has(w) && !assetWords.has(w) && !assetStems.some((st) => w.startsWith(st)) && !monthNo(w) && !CHANNEL_WORDS.some((c) => c.re.test(w)) && /^[а-яa-z-]+$/.test(w));
  if (ws.length === 0 || ws.length > 4) return undefined;
  return ws.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

/** Дописывает в карточку брони то, что понятно из фразы. «не Рио, а Муха» — берётся часть после «а». */
export function applyBookingText(prev: BookingDraft, raw: string, assets: PAsset[], channels: BChannel[], today: string): { draft: BookingDraft; carNamed: boolean } {
  const d: BookingDraft = { ...prev, texts: [...prev.texts, raw.trim()] };
  let text = raw.trim();
  const corr = norm(text).match(/(?:^|\s)не\s.+?\sа\s(.+)$/);
  if (corr) text = corr[1];

  if (prev.awaiting === "guest" && !/\d/.test(text)) {
    const g = guessGuest(text, undefined) ?? text.trim().slice(0, 200);
    d.guestName = g;
    return { draft: d, carNamed: false };
  }

  let rest = text;
  const ph = parsePhone(rest);
  if (ph) {
    d.phone = ph.phone;
    rest = ph.rest;
  }
  const dates = parseDates(rest, today);
  if (dates) {
    d.start = dates.start;
    d.end = dates.end;
    rest = dates.rest;
  }
  const amt = parseBookingAmount(rest);
  if (amt) {
    d.amount = amt.amount;
    rest = amt.rest;
  }
  let carNamed = false;
  const asset = matchApartment(rest, assets);
  if (asset?.kind === "APARTMENT") d.assetId = asset.id;
  else if (asset?.kind === "CAR") carNamed = true;
  const ch = matchChannel(rest, channels);
  if (ch) d.channelId = ch.id;
  const g = carNamed ? undefined : guessGuest(rest, asset ?? undefined);
  if (g) d.guestName = g;
  return { draft: d, carNamed };
}

export function missingBookingFields(d: BookingDraft): BookingField[] {
  const m: BookingField[] = [];
  if (!d.assetId) m.push("asset");
  if (!d.start || !d.end) m.push("dates");
  if (!d.guestName) m.push("guest");
  if (!d.amount) m.push("amount");
  if (!d.channelId) m.push("channel");
  return m;
}

export const BOOKING_QUESTION: Record<BookingField, string> = {
  asset: "Какая квартира? Назовите или выберите кнопкой.",
  dates: "Какие даты? Например «с 5 по 10 ноября» или «с 5 ноября на 3 ночи».",
  guest: "Как зовут гостя? (фамилия или имя)",
  amount: "Сколько стоит вся бронь, в рублях?",
  channel: "Откуда бронь? Выберите площадку или скажите «напрямую».",
};

/** Высокий сезон: 1 июня – 15 октября (как в форме на сайте). */
export function highSeason(iso: string): boolean {
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  return (m >= 6 && m <= 9) || (m === 10 && d <= 15);
}

/** Комиссия площадки по проценту и сезону заезда, в копейках. */
export function commissionKop(grossKop: number, ch: BChannel | undefined, start: string | undefined): number {
  if (!ch || !start) return 0;
  const pct = highSeason(start) ? ch.highPct : ch.lowPct;
  return Math.round((grossKop * pct) / 100);
}

const ru = (iso: string) => iso.split("-").reverse().join(".");

export function renderBookingCard(d: BookingDraft, assets: PAsset[], channels: BChannel[], money: (kop: number) => string, grossKop: number | null): string {
  const asset = assets.find((a) => a.id === d.assetId);
  const ch = channels.find((c) => c.id === d.channelId);
  const ok = (v: string | undefined, label: string) => (v ? `✅ ${label}: ${v}` : `❓ ${label}`);
  const nights = d.start && d.end ? Math.round((Date.parse(d.end) - Date.parse(d.start)) / DAY) : 0;
  const comm = grossKop !== null ? commissionKop(grossKop, ch, d.start) : 0;
  return [
    "Новая бронь · квартира",
    ok(asset?.name, "Квартира"),
    ok(d.start && d.end ? `${ru(d.start)} – ${ru(d.end)} (${nights} ноч.)` : undefined, "Даты"),
    ok(d.guestName, "Гость"),
    ok(grossKop !== null ? money(grossKop) : undefined, "Сумма брони"),
    ok(ch ? `${ch.name}${comm ? ` · комиссия ${money(comm)}` : ""}` : undefined, "Площадка"),
    `${d.phone ? "✅" : "·"} Телефон: ${d.phone ?? "не указан (можно сказать «телефон …»)"}`,
  ].join("\n");
}
