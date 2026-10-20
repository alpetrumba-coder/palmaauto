import { getSetting } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";

export type AccountBalance = {
  id: string;
  name: string;
  kind: "CARD" | "CASH" | "ONLINE";
  responsible: string | null;
  active: boolean;
  openingKop: number;
  incomeKop: number;
  expenseKop: number;
  handoverKop: number;
  transferOutKop: number;
  transferInKop: number;
  balanceKop: number;
};

/** Дата начала учёта (YYYY-MM-DD): остатки касс = начальный остаток на эту дату + операции с неё. Задаёт владелец. */
export const START_DATE_KEY = "accounting.startDate";

export async function getAccountingStartDate(): Promise<string | null> {
  const v = await getSetting(START_DATE_KEY);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

/**
 * Остатки по кассам: начальный остаток + приходы − расходы − сдачи в Рубин − перемещения наружу + перемещения внутрь.
 * Учитываются только операции с даты начала учёта (если задана). Аннулированные и перенесённые из старой
 * истории (isImported) операции не учитываются: остаток на дату начала задаётся вручную.
 */
export async function getAccountBalances(): Promise<AccountBalance[]> {
  const start = await getAccountingStartDate();
  const fromStart = start ? { date: { gte: new Date(`${start}T00:00:00.000Z`) } } : {};
  const [accounts, byAccount, transfersIn] = await Promise.all([
    prisma.cashAccount.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.operation.groupBy({
      by: ["accountId", "type"],
      where: { voidedAt: null, isImported: false, ...fromStart },
      _sum: { amountKop: true },
    }),
    prisma.operation.groupBy({
      by: ["toAccountId"],
      where: { voidedAt: null, isImported: false, type: "TRANSFER", toAccountId: { not: null }, ...fromStart },
      _sum: { amountKop: true },
    }),
  ]);

  const sum = (accountId: string, type: string) =>
    byAccount.find((r) => r.accountId === accountId && r.type === type)?._sum.amountKop ?? 0;

  return accounts.map((a) => {
    const incomeKop = sum(a.id, "INCOME");
    const expenseKop = sum(a.id, "EXPENSE");
    const handoverKop = sum(a.id, "HANDOVER");
    const transferOutKop = sum(a.id, "TRANSFER");
    const transferInKop = transfersIn.find((r) => r.toAccountId === a.id)?._sum.amountKop ?? 0;
    return {
      id: a.id,
      name: a.name,
      kind: a.kind,
      responsible: a.responsible,
      active: a.active,
      openingKop: a.openingKop,
      incomeKop,
      expenseKop,
      handoverKop,
      transferOutKop,
      transferInKop,
      balanceKop: a.openingKop + incomeKop - expenseKop - handoverKop - transferOutKop + transferInKop,
    };
  });
}

export const OPERATION_TYPE_LABEL = {
  INCOME: "Приход",
  EXPENSE: "Расход",
  TRANSFER: "Перемещение",
  HANDOVER: "Сдано в Рубин",
} as const;

export type DealTotals = { paidKop: number; expenseKop: number };

/** Оплачено (приходы) и расходы по заездам/арендам; аннулированные операции не считаются. */
export async function getDealTotals(dealIds: string[]): Promise<Map<string, DealTotals>> {
  const map = new Map<string, DealTotals>();
  if (dealIds.length === 0) return map;
  const rows = await prisma.operation.groupBy({
    by: ["dealId", "type"],
    where: { voidedAt: null, dealId: { in: dealIds }, type: { in: ["INCOME", "EXPENSE"] } },
    _sum: { amountKop: true },
  });
  for (const r of rows) {
    if (!r.dealId) continue;
    const t = map.get(r.dealId) ?? { paidKop: 0, expenseKop: 0 };
    if (r.type === "INCOME") t.paidKop += r._sum.amountKop ?? 0;
    else t.expenseKop += r._sum.amountKop ?? 0;
    map.set(r.dealId, t);
  }
  return map;
}
