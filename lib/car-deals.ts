/**
 * Брони машин с сайта ↔ карточки аренды в учёте. У каждой брони машины (с сайта или созданной в админке) есть карточка
 * аренды (Deal) со сквозным номером — как у заездов по квартирам. Связь — Deal.siteBookingId, машина ↔ объект — Asset.carSlug.
 * Тестовые брони (isTest) в учёт не попадают. Отменённая бронь не удаляется: карточка помечается «отменена», номер и деньги остаются.
 */

import type { Prisma } from "@prisma/client";

import { formatBookingUserLabel } from "@/lib/booking-display";
import { prisma } from "@/lib/prisma";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const rd = (d: Date) => iso(d).slice(5).split("-").reverse().join(".");
const rub = (kop: number) => `${(kop / 100).toLocaleString("ru-RU")} ₽`;

export const CAR_INCOME_CATEGORY = "Доходы от сдачи машин в аренду посуточно";

/** Создаёт или обновляет карточку аренды по брони машины. Возвращает номер карточки (null — тестовая бронь или машина не в учёте). */
export async function syncCarDeal(bookingId: string): Promise<{ dealId: string; number: number } | null> {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { car: { select: { slug: true, make: true, model: true } }, user: true } });
  if (!b || b.isTest || b.status === "DRAFT") return null;
  const asset = await prisma.asset.findFirst({ where: { kind: "CAR", carSlug: b.car.slug } });
  if (!asset) {
    console.warn("[car-deals] машина не связана с объектом учёта (Asset.carSlug)", b.car.slug);
    return null;
  }

  const want = {
    assetId: asset.id,
    guestName: formatBookingUserLabel(b.user),
    phone: b.user.phone ?? null,
    startDate: b.startDate,
    endDate: b.endDate,
    grossKop: Math.max(0, b.totalPriceRub) * 100,
    status: b.status === "CANCELLED" ? ("CANCELLED" as const) : ("ACTIVE" as const),
  };

  const deal = await prisma.deal.findUnique({ where: { siteBookingId: b.id } });
  if (!deal) {
    const created = await prisma.deal.create({
      data: {
        ...want,
        siteBookingId: b.id,
        createdBy: "Сайт",
        comment: `Бронь машины ${b.car.make} ${b.car.model} с сайта`,
        changes: { create: { source: "site", text: `Создана из брони машины на сайте${want.status === "CANCELLED" ? " (бронь отменена)" : ""}` } },
      },
    });
    return { dealId: created.id, number: created.number };
  }

  const logs: string[] = [];
  const data: Prisma.DealUpdateInput = {};
  if (iso(deal.startDate) !== iso(want.startDate) || iso(deal.endDate) !== iso(want.endDate)) {
    logs.push(`Даты: ${rd(deal.startDate)}–${rd(deal.endDate)} → ${rd(want.startDate)}–${rd(want.endDate)} (изменено в брони на сайте)`);
    data.startDate = want.startDate;
    data.endDate = want.endDate;
  }
  if (deal.grossKop !== want.grossKop) {
    logs.push(`Сумма: ${rub(deal.grossKop)} → ${rub(want.grossKop)} (изменено в брони на сайте)`);
    data.grossKop = want.grossKop;
  }
  if (deal.assetId !== want.assetId) {
    logs.push(`Машина изменена в брони на сайте: ${b.car.make} ${b.car.model}`);
    data.asset = { connect: { id: want.assetId } };
  }
  if (deal.guestName !== want.guestName) {
    logs.push(`Арендатор: «${deal.guestName}» → «${want.guestName}»`);
    data.guestName = want.guestName;
  }
  if (want.phone && deal.phone !== want.phone) data.phone = want.phone;
  if (deal.status !== want.status) {
    logs.push(want.status === "CANCELLED" ? "Бронь отменена на сайте — номер и расчёты сохранены" : "Бронь снова активна");
    data.status = want.status;
  }
  if (Object.keys(data).length > 0) {
    if (logs.length) data.changes = { create: logs.map((text) => ({ source: "site", text })) };
    await prisma.deal.update({ where: { id: deal.id }, data });
  }
  return { dealId: deal.id, number: deal.number };
}

/** То же для всех броней, изменённых с момента since (или всех, если since не задан). Без исключений наружу — для фоновых вызовов. */
export async function syncCarDeals(since?: Date): Promise<number> {
  const rows = await prisma.booking.findMany({ where: { isTest: false, status: { not: "DRAFT" }, ...(since ? { updatedAt: { gte: since } } : {}) }, select: { id: true } });
  let n = 0;
  for (const r of rows) {
    try {
      if (await syncCarDeal(r.id)) n++;
    } catch (e) {
      console.error("[car-deals] sync", r.id, e instanceof Error ? e.message : e);
    }
  }
  return n;
}

/** Безопасный вызов после изменения брони: ошибка учёта не должна ломать бронирование на сайте. */
export async function syncCarDealSafe(bookingId: string) {
  try {
    await syncCarDeal(bookingId);
  } catch (e) {
    console.error("[car-deals] syncCarDealSafe", bookingId, e instanceof Error ? e.message : e);
  }
}

/**
 * Онлайн-оплата A-Mobile → приход в кассу «Монета» к карточке аренды. Повторное уведомление с тем же номером платежа
 * второй раз не записывается.
 */
export async function recordOnlinePayment(bookingId: string, paidRub: number, providerPaymentId: string) {
  try {
    const link = await syncCarDeal(bookingId);
    if (!link || paidRub <= 0) return;
    const mark = `A-Mobile №${providerPaymentId}`;
    if (await prisma.operation.findFirst({ where: { dealId: link.dealId, type: "INCOME", comment: { contains: mark } } })) return;
    const [account, category, deal] = await Promise.all([
      prisma.cashAccount.findFirst({ where: { name: "Монета" } }),
      prisma.category.findFirst({ where: { kind: "INCOME", name: CAR_INCOME_CATEGORY } }),
      prisma.deal.findUnique({ where: { id: link.dealId }, select: { assetId: true } }),
    ]);
    if (!account) {
      console.error("[car-deals] нет кассы «Монета» — онлайн-оплата не записана в учёт", bookingId);
      return;
    }
    await prisma.operation.create({
      data: {
        date: new Date(`${iso(new Date())}T00:00:00Z`),
        type: "INCOME",
        amountKop: paidRub * 100,
        accountId: account.id,
        categoryId: category?.id ?? null,
        dealId: link.dealId,
        assetId: deal?.assetId ?? null,
        comment: `Онлайн-оплата на сайте (${mark})`,
        createdBy: "Сайт (A-Mobile)",
      },
    });
  } catch (e) {
    console.error("[car-deals] recordOnlinePayment", bookingId, e instanceof Error ? e.message : e);
  }
}
