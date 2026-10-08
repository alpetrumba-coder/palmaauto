import type { OpAccount, OpAsset, OpCategory, OpDeal } from "@/components/admin/OperationForm";
import { prisma } from "@/lib/prisma";

export function fmtDate(d: Date): string {
  return d.toLocaleDateString("ru-RU", { timeZone: "UTC" });
}

export function fmtDateShort(d: Date): string {
  return d.toLocaleDateString("ru-RU", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
}

/** Подпись заезда/аренды для выпадающих списков: «№12 · Иванов · 01.10–05.10 · Маркиза». */
export function dealLabel(d: { number: number; guestName: string; startDate: Date; endDate: Date; asset: { name: string } }): string {
  return `№${d.number} · ${d.guestName} · ${fmtDateShort(d.startDate)}–${fmtDateShort(d.endDate)} · ${d.asset.name}`;
}

/** Варианты для формы операции: активные кассы/статьи/объекты и недавние заезды (плюс заданные, даже если отключены). */
export async function loadOperationFormOptions(extra?: { accountIds?: (string | null | undefined)[]; dealId?: string | null }) {
  const since = new Date(Date.now() - 200 * 86400000);
  const extraAccounts = (extra?.accountIds ?? []).filter((x): x is string => !!x);

  const [accounts, categories, assets, deals] = await Promise.all([
    prisma.cashAccount.findMany({
      where: { OR: [{ active: true }, { id: { in: extraAccounts } }] },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.category.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.asset.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.deal.findMany({
      where: { OR: [{ status: "ACTIVE", endDate: { gte: since } }, ...(extra?.dealId ? [{ id: extra.dealId }] : [])] },
      include: { asset: { select: { name: true } } },
      orderBy: { startDate: "desc" },
      take: 300,
    }),
  ]);

  return {
    accounts: accounts.map<OpAccount>((a) => ({ id: a.id, name: a.name, responsible: a.responsible })),
    categories: categories.map<OpCategory>((c) => ({ id: c.id, name: c.name, kind: c.kind, nature: c.nature })),
    assets: assets.map<OpAsset>((a) => ({ id: a.id, name: a.name, kind: a.kind })),
    deals: deals.map<OpDeal>((d) => ({ id: d.id, label: dealLabel(d), assetId: d.assetId })),
  };
}
