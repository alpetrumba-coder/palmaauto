/**
 * «Стирка … распредели»: сумму за стирку делим поровну между краткосрочными заездами по квартирам, у которых выезд уже был,
 * а стирки ещё нет. Окно — последние 30 дней, но не раньше даты начала учёта. Остаток копеек — на последнюю бронь.
 * Перекосы потом правят вручную (операции обычные, их можно исправить или аннулировать).
 */

import { getAccountingStartDate } from "@/lib/accounting";
import { prisma } from "@/lib/prisma";

export const LAUNDRY_CATEGORY = "Стирка белья";
const SHORT_STAY_MAX_NIGHTS = 28;
const WINDOW_DAYS = 30;
const DAY = 86400000;

export type LaundryTarget = { id: string; number: number; guestName: string; assetId: string; assetName: string; endDate: Date };

export async function findLaundryTargets(today: Date = new Date()): Promise<LaundryTarget[]> {
  const t = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const startStr = await getAccountingStartDate();
  const start = startStr ? new Date(`${startStr}T00:00:00Z`) : null;
  const windowStart = new Date(t.getTime() - WINDOW_DAYS * DAY);
  const from = start && start > windowStart ? start : windowStart;
  const cat = await prisma.category.findFirst({ where: { name: LAUNDRY_CATEGORY }, select: { id: true } });
  const deals = await prisma.deal.findMany({
    where: {
      status: "ACTIVE",
      asset: { kind: "APARTMENT" },
      endDate: { gte: from, lte: t },
      ...(cat ? { operations: { none: { categoryId: cat.id, voidedAt: null } } } : {}),
    },
    include: { asset: { select: { name: true } } },
    orderBy: [{ endDate: "asc" }, { number: "asc" }],
  });
  return deals
    .filter((d) => (d.endDate.getTime() - d.startDate.getTime()) / DAY < SHORT_STAY_MAX_NIGHTS)
    .map((d) => ({ id: d.id, number: d.number, guestName: d.guestName, assetId: d.assetId, assetName: d.asset.name, endDate: d.endDate }));
}

/** Поровну, остаток копеек — на последнюю бронь. */
export function splitEven(totalKop: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(totalKop / n);
  const out = Array.from({ length: n }, () => base);
  out[n - 1] += totalKop - base * n;
  return out;
}

/** Записывает по операции «Стирка белья» на каждую бронь. Возвращает номера созданных операций. */
export async function createLaundryOps(input: { totalKop: number; accountId: string; date: Date; createdBy: string; dealIds: string[]; said?: string }): Promise<number[]> {
  const cat = await prisma.category.findFirst({ where: { name: LAUNDRY_CATEGORY, kind: "EXPENSE" } });
  if (!cat) throw new Error(`Нет статьи «${LAUNDRY_CATEGORY}».`);
  const deals = await prisma.deal.findMany({ where: { id: { in: input.dealIds } }, select: { id: true, assetId: true, number: true }, orderBy: [{ endDate: "asc" }, { number: "asc" }] });
  if (deals.length === 0) throw new Error("Нет броней для распределения.");
  const parts = splitEven(input.totalKop, deals.length);
  const total = (input.totalKop / 100).toLocaleString("ru-RU");
  const ops = await prisma.$transaction(
    deals.map((d, i) =>
      prisma.operation.create({
        data: {
          date: input.date,
          type: "EXPENSE",
          amountKop: parts[i],
          accountId: input.accountId,
          categoryId: cat.id,
          dealId: d.id,
          assetId: d.assetId,
          comment: `Стирка распределена: ${total} ₽ на ${deals.length} брон.${input.said ? ` · ${input.said}` : ""}`.slice(0, 1000),
          createdBy: input.createdBy,
        },
        select: { number: true },
      }),
    ),
  );
  return ops.map((o) => o.number);
}
