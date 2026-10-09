import { prisma } from "@/lib/prisma";

/** Строка нормализованной истории (scripts/import-uk/normalize.py). Кассы, статьи и объекты — по названиям. */
export type ImportOperation = {
  sourceRef: string;
  date: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER" | "HANDOVER";
  amountKop: number;
  accountName: string;
  categoryName: string | null;
  assetName: string | null;
  comment: string;
  needsReview: boolean;
  reviewNote: string | null;
};

export type ImportResult = { created: number; alreadyThere: number; total: number };

export type ImportPreview = {
  total: number;
  alreadyThere: number;
  toCreate: number;
  needsReview: number;
  byType: Record<string, number>;
  missing: string[];
};

type Prepared = {
  sourceRef: string;
  date: Date;
  type: ImportOperation["type"];
  amountKop: number;
  accountId: string;
  categoryId: string | null;
  assetId: string | null;
  comment: string;
  needsReview: boolean;
  reviewNote: string | null;
  isImported: true;
  createdBy: string;
};

/** Сопоставляет названия с записями справочников и проверяет строки; названия, которых нет, возвращаются списком. */
async function prepare(ops: ImportOperation[], createdBy: string): Promise<{ data: Prepared[]; missing: string[] }> {
  const [accounts, categories, assets] = await Promise.all([
    prisma.cashAccount.findMany({ select: { id: true, name: true } }),
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.asset.findMany({ select: { id: true, name: true } }),
  ]);
  const acc = new Map(accounts.map((a) => [a.name, a.id]));
  const cat = new Map(categories.map((c) => [c.name, c.id]));
  const ast = new Map(assets.map((a) => [a.name, a.id]));

  const missing = new Set<string>();
  const data = ops.map((o): Prepared => {
    const accountId = acc.get(o.accountName);
    if (!accountId) missing.add(`касса «${o.accountName}»`);
    const categoryId = o.categoryName ? cat.get(o.categoryName) : null;
    if (o.categoryName && !categoryId) missing.add(`статья «${o.categoryName}»`);
    const assetId = o.assetName ? ast.get(o.assetName) : null;
    if (o.assetName && !assetId) missing.add(`объект «${o.assetName}»`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date)) throw new Error(`Некорректная дата в ${o.sourceRef}: ${o.date}`);
    if (!Number.isInteger(o.amountKop) || o.amountKop <= 0) throw new Error(`Некорректная сумма в ${o.sourceRef}`);
    return {
      sourceRef: o.sourceRef,
      date: new Date(`${o.date}T00:00:00.000Z`),
      type: o.type,
      amountKop: o.amountKop,
      accountId: accountId as string,
      categoryId: categoryId ?? null,
      assetId: assetId ?? null,
      comment: o.comment,
      needsReview: o.needsReview,
      reviewNote: o.reviewNote,
      isImported: true,
      createdBy,
    };
  });
  return { data, missing: [...missing] };
}

async function countExisting(refs: string[]): Promise<number> {
  let n = 0;
  for (let i = 0; i < refs.length; i += 1000) {
    n += await prisma.operation.count({ where: { sourceRef: { in: refs.slice(i, i + 1000) } } });
  }
  return n;
}

/** Предпросмотр без записи: сколько будет создано, сколько уже есть, чего не хватает в справочниках. */
export async function previewImport(ops: ImportOperation[]): Promise<ImportPreview> {
  const { data, missing } = await prepare(ops, "Импорт УК.xlsx");
  const alreadyThere = await countExisting(data.map((d) => d.sourceRef));
  const byType: Record<string, number> = {};
  for (const d of data) byType[d.type] = (byType[d.type] ?? 0) + 1;
  return {
    total: data.length,
    alreadyThere,
    toCreate: data.length - alreadyThere,
    needsReview: data.filter((d) => d.needsReview).length,
    byType,
    missing,
  };
}

/**
 * Загружает историю как «перенесённые» операции (isImported=true): они видны в журнале и отчётах,
 * но не меняют остатки касс. Повторный запуск безопасен: строки с тем же sourceRef не дублируются и не перезаписываются.
 * Названия касс/статей/объектов должны существовать в справочниках (иначе — понятная ошибка до записи).
 */
export async function importOperations(ops: ImportOperation[], createdBy = "Импорт УК.xlsx"): Promise<ImportResult> {
  const { data, missing } = await prepare(ops, createdBy);
  if (missing.length > 0) {
    throw new Error(`В справочниках не найдено: ${missing.join(", ")}. Сначала заполните справочники («Справочники → Заполнить стартовыми данными»).`);
  }
  let created = 0;
  for (let i = 0; i < data.length; i += 500) {
    const res = await prisma.operation.createMany({ data: data.slice(i, i + 500), skipDuplicates: true });
    created += res.count;
  }
  return { created, alreadyThere: data.length - created, total: data.length };
}
