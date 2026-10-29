/**
 * Разбор фраз Telegram-бота («расход 500 стирка заезд 23 карта х»). Чистые функции без базы — их легко проверять.
 */

export type PCategory = { id: string; name: string; kind: "INCOME" | "EXPENSE"; aliases: string | null };
export type PAsset = { id: string; name: string; kind: "APARTMENT" | "CAR"; aliases: string | null };
export type PAccount = { id: string; name: string };

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/[«»"',.;:!?()]/g, " ").replace(/\s+/g, " ").trim();
const words = (s: string) => norm(s).split(" ").filter((w) => w.length >= 2);
/** Сравнение по началу слова (5 букв), чтобы «стирку», «стирка», «стирки» совпадали. */
const stem = (w: string) => w.slice(0, Math.min(5, w.length));

/** Сумма: первое число во фразе (пробелы внутри числа допускаются: «15 000»). Возвращает рубли строкой и остаток фразы. */
export function parseAmount(text: string): { amount: string; rest: string } | null {
  const m = text.match(/(\d[\d\s]*(?:[.,]\d{1,2})?)/);
  if (!m || m.index === undefined) return null;
  const amount = m[1].replace(/\s/g, "").replace(",", ".");
  if (!(Number(amount) > 0)) return null;
  return { amount, rest: (text.slice(0, m.index) + " " + text.slice(m.index + m[0].length)).trim() };
}

/** Номер заезда/аренды: «заезд 23», «заезд №23», «аренда 5», «№23». */
export function parseDealNumber(text: string): number | null {
  const m = norm(text.replace(/№/g, " № ")).match(/(?:заезд\w*|аренд\w*|бронь|брони|№)\s*№?\s*(\d{1,6})/);
  return m ? Number(m[1]) : null;
}

/** Убирает из фразы упоминание номера заезда, чтобы число не мешало поиску суммы. */
export function stripDealNumber(text: string): string {
  return text.replace(/(?:заезд\S*|аренд\S*|бронь|брони|№)\s*№?\s*\d{1,6}/gi, " ").replace(/\s+/g, " ").trim();
}

// \b в JS не работает с кириллицей — границы через пробел/начало/конец строки.
const ACCOUNT_PATTERNS: { re: RegExp; name: string }[] = [
  { re: /касс\w*\s+ев\w*|налич\w*|(?:^|\s)нал(?:\s|$)/, name: "Касса Ева" },
  { re: /карт\w*\s+(?:х|икс|x)(?:\s|$)/, name: "Карта Х" },
  { re: /амр\w*/, name: "Карта Амра-Банк" },
  { re: /рубин\w*/, name: "Касса Рубина" },
  { re: /монет\w*/, name: "Монета" },
];

/** Кассы, упомянутые во фразе, в порядке упоминания. */
export function findAccounts(text: string, accounts: PAccount[]): PAccount[] {
  const t = norm(text);
  const hits: { pos: number; acc: PAccount }[] = [];
  for (const p of ACCOUNT_PATTERNS) {
    const m = t.match(p.re);
    const acc = accounts.find((a) => a.name === p.name);
    if (m && m.index !== undefined && acc) hits.push({ pos: m.index, acc });
  }
  for (const a of accounts) {
    const i = t.indexOf(norm(a.name));
    if (i >= 0 && !hits.some((h) => h.acc.id === a.id)) hits.push({ pos: i, acc: a });
  }
  return hits.sort((x, y) => x.pos - y.pos).map((h) => h.acc);
}

/** Синонимы разговорных слов → статья (по точному названию). carOnly/aptOnly — когда слово зависит от объекта. */
const CATEGORY_SYNONYMS: { words: string[]; name: string; car?: boolean; apt?: boolean }[] = [
  { words: ["стирка", "стирк", "прачечн", "белье"], name: "Стирка белья" },
  { words: ["уборк", "клининг"], name: "Уборка" },
  { words: ["бензин", "топлив", "заправк", "гсм", "солярк", "дизель"], name: "ГСМ" },
  { words: ["ремонт", "запчаст", "шиномонт", "мойка", "масло"], name: "Ремонт служебного автомобиля", car: true },
  { words: ["ремонт", "сантехн", "электрик", "починк"], name: "Мелкий ремонт", apt: true },
  { words: ["хоз", "моющ", "бытов", "химия", "порошок"], name: "Хозяйственные расходы" },
  { words: ["посуд", "полотенц", "мбп", "лампочк"], name: "МБП (мелкие бытовые принадлежности)" },
  { words: ["развоз", "такси", "доставк", "трансп"], name: "Транспортные расходы (такси)" },
  { words: ["реклам", "продвиж", "авито"], name: "Реклама" },
  { words: ["связь", "телефон"], name: "Связь" },
  { words: ["интерн", "вайфа", "wifi"], name: "Интернет" },
  { words: ["коммун", "свет", "электричеств", "вода", "газ"], name: "Коммунальные платежи" },
  { words: ["возврат"], name: "Возврат клиенту" },
  { words: ["комисс"], name: "Банковская комиссия" },
  { words: ["канцтов", "бумаг", "картридж"], name: "Канцтовары и мелкая техника" },
  { words: ["чай", "кофе"], name: "Чай, вода, кофе" },
];

/**
 * Статья по фразе. Сначала полное название или его синоним из справочника (aliases), затем словарь разговорных слов.
 * assetKind помогает различить «ремонт» квартиры и машины. Несколько равных вариантов → null (бот переспросит).
 */
export function matchCategory(text: string, categories: PCategory[], kind: "INCOME" | "EXPENSE", assetKind?: "APARTMENT" | "CAR"): PCategory | null {
  const t = norm(text);
  const cats = categories.filter((c) => c.kind === kind);
  // 1) полное название или синоним из справочника
  const full = cats.filter((c) => [c.name, ...(c.aliases ?? "").split(/[\n;]/)].map(norm).some((n) => n.length >= 3 && t.includes(n)));
  if (full.length === 1) return full[0];
  // 2) словарь разговорных слов
  const ws = words(text).map(stem);
  const scored = new Map<string, number>();
  for (const syn of CATEGORY_SYNONYMS) {
    if (syn.car && assetKind !== "CAR") continue;
    if (syn.apt && assetKind === "CAR") continue;
    const cat = cats.find((c) => c.name === syn.name);
    if (!cat) continue;
    const hit = syn.words.some((w) => ws.some((x) => x === stem(w) || (w.length <= 3 && x === w)));
    if (hit) scored.set(cat.id, (scored.get(cat.id) ?? 0) + 2); // словарь весомее случайного совпадения со словом из названия
  }
  // 3) слова из названия статьи
  for (const c of cats) {
    const cw = words(c.name).filter((w) => w.length >= 4).map(stem);
    if (cw.some((w) => ws.includes(w))) scored.set(c.id, (scored.get(c.id) ?? 0) + 1);
  }
  const best = [...scored.entries()].sort((a, b) => b[1] - a[1]);
  if (best.length === 0) return full[0] ?? null;
  if (best.length > 1 && best[0][1] === best[1][1]) return null;
  return cats.find((c) => c.id === best[0][0]) ?? null;
}

/** Короткие имена машин, которые люди пишут в боте (в aliases в БД их может не быть). */
const ASSET_SYNONYMS: { words: string[]; name: string }[] = [
  { words: ["приус", "prius"], name: "Toyota Prius" },
  { words: ["ноте", "note"], name: "Nissan Note" },
  { words: ["естима", "эстима", "estima"], name: "Toyota Estima" },
  { words: ["краун", "crown"], name: "Toyota Crown" },
];

/** Объект по фразе: название / aliases из справочника, плюс короткие имена машин («приус»). */
export function matchAsset(text: string, assets: PAsset[]): PAsset | null {
  const t = ` ${norm(text)} `;
  const hits = assets.filter((a) => [a.name, ...(a.aliases ?? "").split(/[\n;]/)].map(norm).filter((n) => n.length >= 3).some((n) => t.includes(n)));
  if (hits.length === 0) {
    for (const syn of ASSET_SYNONYMS) {
      if (syn.words.some((w) => t.includes(` ${norm(w)} `))) {
        const a = assets.find((x) => x.name === syn.name);
        if (a) return a;
      }
    }
    return null;
  }
  return hits.length === 1 ? hits[0] : (hits.sort((a, b) => b.name.length - a.name.length)[0] ?? null);
}
