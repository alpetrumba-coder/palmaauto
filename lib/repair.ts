/**
 * Ремонт (Акиртава 27): смета прораба, накладные и расходы по строкам, баланс по смете.
 *
 * Каждая накладная/расход (RepairDoc) — это и строка журнала учёта (Operation):
 *  • товар из Рубина (УНФ) — расход из «Кассы Гумистинская»;
 *  • покупки вне Рубина, оплата работ, гонорар прораба — расход из кассы, которую назвал прораб.
 * Строки накладной привязываются к строкам сметы: по артикулу автоматически, по названию — подсказкой,
 * остальное — «вне сметы» (владельцу приходит уведомление).
 */
import type { Prisma } from "@prisma/client";

import { formatKop } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import smetaJson from "@/lib/remont-akirtava-smeta.json";
import { sendMessage } from "@/lib/telegram";

export const REPAIR_PROJECT = "akirtava";
export const REPAIR_ASSET_NAME = "Акиртава 27";
export const REPAIR_CATEGORY = "Ремонт по смете";
/** Касса «у Рубина»: товар из Рубина списывается отсюда (сальдо = сальдо УНФ по «Прораб Дима Леготкин»). */
export const RUBIN_ACCOUNT = "Касса Гумистинская";
/** Товар из Рубина на нужды Пальмы — в журнал как неразобранный общий расход (нужно выбрать статью/объект). */
export const PALMA_CATEGORY = "Прочие расходы (не классифицировано)";
/** Возврат товара в Рубин: деньги возвращаются на баланс — это не доход. */
export const RETURN_CATEGORY = "Служебное: возврат товара в Рубин (не доход)";

export const FEE_LINE_NO = 9001;
export const OVERHEAD_LINE_NO = 9002;

export const KIND_LABEL: Record<string, string> = {
  goods: "Товар",
  work: "Оплата работ",
  fee: "Гонорар прораба",
  return: "Возврат товара",
};
export const DEST_LABEL: Record<string, string> = { akirtava: "Акиртава", palma: "Пальма", unknown: "Не указано" };

const kop = (rub: number | null | undefined) => Math.round((rub ?? 0) * 100);

// ----------------------------------------------------------------------------- смета

/** Артикулы в названии: числа из 6–8 цифр (2008907, 8110902…). */
export function articlesOf(name: string): string[] {
  return [...new Set(name.match(/(?<![\d,.])\d{6,8}(?!\d)(?![.,]\d)/g) ?? [])];
}

/** Смета в базе появляется из файла сметы при первом обращении; там же — первая накладная (ТН 68845). */
let seeded: Promise<void> | null = null;
export function ensureRepairSeed(): Promise<void> {
  if (!seeded) seeded = doSeed().catch((e) => {
    seeded = null;
    throw e;
  });
  return seeded;
}

async function doSeed() {
  const count = await prisma.repairEstimateItem.count({ where: { project: REPAIR_PROJECT } });
  if (count === 0) {
    const rows: Prisma.RepairEstimateItemCreateManyInput[] = smetaJson.items.map((it, i) => ({
      project: REPAIR_PROJECT,
      lineNo: i + 1,
      kind: it.kind === "work" ? "work" : "material",
      section: it.section || "Прочее",
      subsection: it.subsection ?? "",
      name: it.name,
      article: articlesOf(it.name)[0] ?? null,
      unit: it.unit ?? "",
      qty: it.qty,
      priceKop: it.price == null ? null : kop(it.price),
      sumKop: kop(it.sum),
    }));
    rows.push(
      { project: REPAIR_PROJECT, lineNo: FEE_LINE_NO, kind: "fee", section: "Гонорар прораба", name: `Гонорар прораба — ${smetaJson.foreman}`, unit: "", sumKop: kop(smetaJson.totals.foremanFee) },
      { project: REPAIR_PROJECT, lineNo: OVERHEAD_LINE_NO, kind: "overhead", section: "Накладные расходы 5%", name: "Накладные расходы 5% (по смете)", unit: "", sumKop: kop(smetaJson.totals.overhead) },
    );
    await prisma.repairEstimateItem.createMany({ data: rows, skipDuplicates: true });
  }
  await seedFirstInvoice();
}

/** ТН 68845 от 21.11.2026 (ООО «ТДР») уже записана в журнал вручную (операция №4052) — заводим её строки и связываем. */
const FIRST_INVOICE = {
  ref: "unf:rn:НФНФ-068845",
  number: "НФНФ-068845",
  date: "2026-11-21",
  opNumber: 4052,
  lines: [
    ["Саморезы гипсокартон-дерево 3,8x65 (фосфатирован. 100 шт) SB", "упак", 3, 187],
    ["Дюбель-гвоздь 6x60 гриб (100 шт) SB", "упак", 1, 470],
    ["Саморезы гипсокартон-дерево 4,8x100 (фосфатирован. 75 шт) SB", "упак", 1, 265],
    ["Саморезы гипсокартон-дерево 3,5x41 (фосфатирован. 650 шт) SB", "упак", 1, 760],
    ["Саморезы гипсокартон-металл 4,2x75 (фосфатирован. 200 шт) SB", "шт", 1, 390],
    ["Ведро строительное пластмассовое круглое 20л 837960/260693", "шт", 2, 155],
    ["Нож с выдвижным лезвием 18 мм Вихрь двухкомпонентный корпус, автоматический фиксатор", "шт", 2, 180],
    ["Пленка защитная для малярных работ 4х3м 100мкм 2008911", "шт", 3, 230],
    ["Тент защитный 4х12,5м 6мкм 2008907", "шт", 2, 235],
    ["Лезвия отламывающиеся Вихрь 18мм (10шт.) для ножей", "упак", 2, 70],
    ["Малярный карандаш 175мм 8110902, уп. 2 шт", "пара", 2, 30],
  ] as [string, string, number, number][],
};

async function seedFirstInvoice() {
  if (await prisma.repairDoc.findUnique({ where: { externalRef: FIRST_INVOICE.ref }, select: { id: true } })) return;
  const op = await prisma.operation.findUnique({ where: { number: FIRST_INVOICE.opNumber }, select: { id: true, amountKop: true, voidedAt: true } });
  const items = await loadEstimate();
  const lines = FIRST_INVOICE.lines.map(([name, unit, qty, price], i) => {
    const m = matchEstimate(name, items, "material")[0];
    return { lineNo: i + 1, name, unit, qty, priceKop: kop(price), sumKop: kop(price * qty), article: articlesOf(name)[0] ?? null, estimateItemId: m?.item.id ?? null, matchMode: m?.mode ?? "none" };
  });
  try {
    await prisma.repairDoc.create({
      data: {
        project: REPAIR_PROJECT,
        source: "unf",
        externalRef: FIRST_INVOICE.ref,
        number: FIRST_INVOICE.number,
        date: new Date(`${FIRST_INVOICE.date}T00:00:00Z`),
        supplier: "ООО «ТДР» (Рубин), Аргун 29",
        kind: "goods",
        destination: "akirtava",
        totalKop: lines.reduce((s, l) => s + l.sumKop, 0),
        comment: "Товарная накладная № 68845 от 21.11.2026, получатель Прораб Дима Леготкин.",
        operationId: op && !op.voidedAt && op.amountKop === 447600 ? op.id : null,
        createdBy: "система (перенос)",
        lines: { create: lines },
      },
    });
  } catch (e) {
    if ((e as { code?: string }).code !== "P2002") throw e;
  }
}

export type EstimateItem = { id: string; lineNo: number; kind: string; section: string; subsection: string; name: string; article: string | null; unit: string; qty: number | null; priceKop: number | null; sumKop: number };

export async function loadEstimate(): Promise<EstimateItem[]> {
  return prisma.repairEstimateItem.findMany({ where: { project: REPAIR_PROJECT }, orderBy: { lineNo: "asc" } });
}

// ----------------------------------------------------------------------------- сопоставление со сметой

const STOP = new Set(["для", "под", "или", "шт", "упак", "уп", "мм", "см", "без", "при", "из", "на", "по", "the", "купил", "купила", "заплатил", "оплатил", "акиртава", "акиртаву", "акиртав", "ремонт", "кассы", "касса", "карты", "карта"]);

function tokens(s: string): string[] {
  const t = s.toLowerCase().replace(/ё/g, "е").replace(/[«»"'(),.;:!?/\\]+/g, " ");
  const out: string[] = [];
  for (const w of t.split(/[\s\-–—]+/)) {
    if (!w || STOP.has(w)) continue;
    if (/^\d+([.,]\d+)?$/.test(w)) continue; // голые числа (количество, сумма) не сравниваем
    if (/\d/.test(w)) {
      out.push(w); // размеры вроде 20л, 4х12,5м
      continue;
    }
    if (w.length < 3) continue;
    out.push(w.slice(0, 4));
  }
  return [...new Set(out)];
}

export type EstimateMatch = { item: EstimateItem; mode: "article" | "name"; score: number };

/**
 * Кандидаты из сметы для строки накладной / фразы прораба, лучшие первыми.
 * 1) совпал артикул — точно; 2) похожее название (первое слово совпало + общие слова) — подсказка.
 */
export function matchEstimate(text: string, items: EstimateItem[], kind: "material" | "work" | null): EstimateMatch[] {
  const pool = items.filter((i) => (i.kind === "material" || i.kind === "work") && (!kind || i.kind === kind));
  const arts = articlesOf(text);
  if (arts.length) {
    const byArt = pool.filter((i) => i.article && arts.includes(i.article));
    if (byArt.length) return byArt.map((item) => ({ item, mode: "article" as const, score: 1 }));
  }
  const tt = tokens(text);
  if (tt.length === 0) return [];
  const scored: EstimateMatch[] = [];
  for (const item of pool) {
    const it = tokens(item.name);
    if (it.length === 0) continue;
    const common = tt.filter((w) => it.includes(w)).length;
    if (common === 0) continue;
    let score = (2 * common) / (tt.length + it.length);
    if (tt[0] === it[0]) score += 0.3; // совпало главное слово («саморезы», «ведро»)
    if (score >= 0.45) scored.push({ item, mode: "name", score });
  }
  return scored.sort((a, b) => b.score - a.score || b.item.sumKop - a.item.sumKop).slice(0, 5);
}

// ----------------------------------------------------------------------------- запись накладной + операции

export type RepairLineInput = { name: string; article?: string | null; unit?: string | null; qty?: number | null; priceKop?: number | null; sumKop: number; estimateItemId?: string | null; matchMode?: string };

export type RepairDocInput = {
  source: "unf" | "bot" | "site";
  externalRef?: string | null;
  number?: string | null;
  date: Date;
  supplier?: string | null;
  kind: "goods" | "work" | "fee" | "return";
  destination: "akirtava" | "palma" | "unknown";
  accountId: string;
  comment?: string | null;
  lines: RepairLineInput[];
  createdBy: string;
};

async function categoryId(name: string, kind: "INCOME" | "EXPENSE"): Promise<string> {
  const c = await prisma.category.findUnique({ where: { name } });
  if (c) return c.id;
  const created = await prisma.category.upsert({ where: { name }, update: {}, create: { name, kind, nature: "FIXED", active: true } });
  return created.id;
}

/** Создаёт накладную со строками и строку журнала. Возвращает id накладной и номер операции. */
export async function createRepairDoc(input: RepairDocInput): Promise<{ docId: string; opNumber: number }> {
  const totalKop = input.lines.reduce((s, l) => s + l.sumKop, 0);
  if (totalKop <= 0) throw new Error("Сумма должна быть больше нуля.");
  const asset = await prisma.asset.findFirst({ where: { name: REPAIR_ASSET_NAME } });
  const isReturn = input.kind === "return";
  const toRepair = input.destination === "akirtava";
  const catId = isReturn ? await categoryId(RETURN_CATEGORY, "INCOME") : await categoryId(toRepair ? REPAIR_CATEGORY : PALMA_CATEGORY, "EXPENSE");

  const what = input.number ? `${KIND_LABEL[input.kind]} ${input.number}` : KIND_LABEL[input.kind];
  const opComment = [
    toRepair ? "Ремонт Акиртава" : input.destination === "palma" ? "Рубин → Пальма" : "Рубин, назначение не указано",
    what,
    input.supplier ?? "",
    input.comment ?? "",
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 1000);

  return prisma.$transaction(async (tx) => {
    const op = await tx.operation.create({
      data: {
        date: input.date,
        type: isReturn ? "INCOME" : "EXPENSE",
        amountKop: totalKop,
        accountId: input.accountId,
        categoryId: catId,
        assetId: toRepair || isReturn ? (asset?.id ?? null) : null,
        comment: opComment,
        createdBy: input.createdBy,
        needsReview: !toRepair && !isReturn,
        reviewNote: !toRepair && !isReturn ? (input.destination === "palma" ? "Товар из Рубина для Пальмы — выберите статью и объект." : "В УНФ нет пометки «Акиртава»/«Пальма» — уточните назначение на странице «Ремонт Акиртава → Накладные».") : null,
        sourceRef: input.externalRef ?? null,
      },
    });
    const doc = await tx.repairDoc.create({
      data: {
        project: REPAIR_PROJECT,
        source: input.source,
        externalRef: input.externalRef ?? null,
        number: input.number ?? null,
        date: input.date,
        supplier: input.supplier ?? null,
        kind: input.kind,
        destination: input.destination,
        totalKop,
        comment: input.comment ?? null,
        operationId: op.id,
        createdBy: input.createdBy,
        lines: {
          create: input.lines.map((l, i) => ({
            lineNo: i + 1,
            name: l.name.slice(0, 500),
            article: l.article ?? articlesOf(l.name)[0] ?? null,
            unit: l.unit ?? null,
            qty: l.qty ?? null,
            priceKop: l.priceKop ?? null,
            sumKop: l.sumKop,
            estimateItemId: l.estimateItemId ?? null,
            matchMode: l.matchMode ?? (l.estimateItemId ? "manual" : "none"),
          })),
        },
      },
    });
    return { docId: doc.id, opNumber: op.number };
  });
}

/** Сменить назначение накладной из Рубина (Акиртава ↔ Пальма): правит и строку журнала. */
export async function setDocDestination(docId: string, destination: "akirtava" | "palma") {
  const doc = await prisma.repairDoc.findUnique({ where: { id: docId } });
  if (!doc) throw new Error("Накладная не найдена.");
  if (doc.kind === "return") throw new Error("У возврата назначение не меняется.");
  const asset = await prisma.asset.findFirst({ where: { name: REPAIR_ASSET_NAME } });
  const catId = await categoryId(destination === "akirtava" ? REPAIR_CATEGORY : PALMA_CATEGORY, "EXPENSE");
  await prisma.$transaction(async (tx) => {
    await tx.repairDoc.update({ where: { id: docId }, data: { destination } });
    if (doc.operationId) {
      await tx.operation.update({
        where: { id: doc.operationId },
        data: {
          categoryId: catId,
          assetId: destination === "akirtava" ? (asset?.id ?? null) : null,
          needsReview: destination !== "akirtava",
          reviewNote: destination === "akirtava" ? null : "Товар из Рубина для Пальмы — выберите статью и объект.",
        },
      });
    }
  });
}

// ----------------------------------------------------------------------------- уведомления

/** Сообщение владельцам в Telegram (у кого привязан чат). Ошибки сети не роняют вызывающий код. */
export async function notifyOwners(text: string) {
  const owners = await prisma.staffUser.findMany({ where: { role: "OWNER", active: true, telegramChatId: { not: null } }, select: { telegramChatId: true } });
  for (const o of owners) {
    if (!o.telegramChatId) continue;
    await sendMessage(o.telegramChatId, text).catch((e) => console.error("[repair-notify]", e instanceof Error ? e.message : e));
  }
}

/** Текст уведомления о строках вне сметы. */
export function offEstimateText(docTitle: string, lines: { name: string; sumKop: number }[], by: string): string {
  return `Ремонт Акиртава — вне сметы (${by}):\n${docTitle}\n${lines.map((l) => `• ${l.name} — ${formatKop(l.sumKop)}`).join("\n")}\n\nСтраница: palmaauto.ru/admin-panel/remont-akirtava/nakladnye`;
}

// ----------------------------------------------------------------------------- баланс

export type BalanceRow = { item: EstimateItem; takenKop: number; takenQty: number; lines: number };
export type BalanceSection = { kind: string; section: string; plannedKop: number; takenKop: number; rows: BalanceRow[] };
export type RepairBalance = {
  sections: BalanceSection[];
  offEstimate: { docId: string; date: Date; number: string | null; name: string; sumKop: number; qty: number | null; unit: string | null }[];
  offEstimateKop: number;
  plannedKop: number;
  takenKop: number;
  docsCount: number;
};

export async function computeBalance(): Promise<RepairBalance> {
  await ensureRepairSeed();
  const items = await loadEstimate();
  const lines = await prisma.repairDocLine.findMany({
    where: { doc: { project: REPAIR_PROJECT, destination: "akirtava", voidedAt: null } },
    include: { doc: { select: { id: true, date: true, number: true, kind: true } } },
  });
  const docsCount = new Set(lines.map((l) => l.docId)).size;
  const sign = (k: string) => (k === "return" ? -1 : 1);
  const byItem = new Map<string, { kop: number; qty: number; n: number }>();
  const offEstimate: RepairBalance["offEstimate"] = [];
  for (const l of lines) {
    const s = sign(l.doc.kind);
    if (!l.estimateItemId) {
      offEstimate.push({ docId: l.doc.id, date: l.doc.date, number: l.doc.number, name: l.name, sumKop: s * l.sumKop, qty: l.qty, unit: l.unit });
      continue;
    }
    const cur = byItem.get(l.estimateItemId) ?? { kop: 0, qty: 0, n: 0 };
    cur.kop += s * l.sumKop;
    cur.qty += s * (l.qty ?? 0);
    cur.n += 1;
    byItem.set(l.estimateItemId, cur);
  }
  const order = (k: string) => ({ material: 0, work: 1, fee: 2, overhead: 3 })[k] ?? 4;
  const map = new Map<string, BalanceSection>();
  for (const item of items) {
    const key = `${item.kind}|${item.section}`;
    const sec = map.get(key) ?? { kind: item.kind, section: item.section, plannedKop: 0, takenKop: 0, rows: [] };
    const t = byItem.get(item.id);
    sec.plannedKop += item.sumKop;
    sec.takenKop += t?.kop ?? 0;
    sec.rows.push({ item, takenKop: t?.kop ?? 0, takenQty: t?.qty ?? 0, lines: t?.n ?? 0 });
    map.set(key, sec);
  }
  const sections = [...map.values()].sort((a, b) => order(a.kind) - order(b.kind) || a.section.localeCompare(b.section, "ru"));
  const offEstimateKop = offEstimate.reduce((s, x) => s + x.sumKop, 0);
  return {
    sections,
    offEstimate,
    offEstimateKop,
    plannedKop: sections.reduce((s, x) => s + x.plannedKop, 0),
    takenKop: sections.reduce((s, x) => s + x.takenKop, 0) + offEstimateKop,
    docsCount,
  };
}
