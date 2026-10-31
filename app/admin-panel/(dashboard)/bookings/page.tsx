import type { Metadata } from "next";
import Link from "next/link";

import { Chessboard, type ChessBar, type ChessRow } from "@/components/admin/Chessboard";
import { getDealTotals } from "@/lib/accounting";
import { bookingGuestPhone, formatBookingGuestLabel } from "@/lib/booking-display";
import { bookingsOverlappingRangeWhere } from "@/lib/booking-overlap";
import { prisma } from "@/lib/prisma";
import type { RcRunSummary } from "@/lib/rc-sync";
import { addUtcDays, buildUtcDayRange, formatDateInputUTC, parseDateInput, utcStartOfMonth, utcToday } from "@/lib/rental-dates";
import type { BookingStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "Шахматка — админ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const NUM_DAYS = 42;

const GREEN = "rgba(90, 140, 90, 0.92)";
const ORANGE = "rgba(220, 140, 120, 0.95)";
const BLUE = "rgba(120, 160, 200, 0.92)";
const GRAY = "rgba(160, 160, 170, 0.85)";

const barColor = (s: BookingStatus) => (s === "PAID" ? GREEN : s === "PENDING_PAYMENT" ? ORANGE : s === "PARTIALLY_PAID" ? BLUE : GRAY);

function compactRub(p: number): string {
  if (p >= 10_000) return `${Math.round(p / 1000)}k`;
  if (p >= 1000) return p % 1000 === 0 ? `${p / 1000}k` : `${(p / 1000).toFixed(1)}k`;
  return String(p);
}

const iso = (d: Date) => formatDateInputUTC(d);
const rd = (s: string) => `${s.slice(8, 10)}.${s.slice(5, 7)}`;

type SP = { from?: string; tab?: string; hidden?: string };

export default async function ChessboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const tab: "cars" | "apts" = sp.tab === "apts" ? "apts" : "cars";
  const showHidden = sp.hidden === "1";

  const parsed = sp.from ? parseDateInput(sp.from) : null;
  const today = utcToday();
  const viewStart =
    parsed && parsed.getTime() >= addUtcDays(today, -365).getTime() && parsed.getTime() <= addUtcDays(today, 800).getTime() ? parsed : utcStartOfMonth(today);
  const viewEnd = addUtcDays(viewStart, NUM_DAYS - 1);
  const days = buildUtcDayRange(viewStart, NUM_DAYS).map(iso);
  const fromStr = iso(viewStart);

  const href = (over: Partial<SP>) => {
    const q = new URLSearchParams();
    const v: SP = { from: fromStr, tab, hidden: showHidden ? "1" : undefined, ...over };
    if (v.from) q.set("from", v.from);
    if (v.tab && v.tab !== "cars") q.set("tab", v.tab);
    if (v.hidden === "1") q.set("hidden", "1");
    const s = q.toString();
    return `/admin-panel/bookings${s ? `?${s}` : ""}`;
  };
  const prevHref = href({ from: iso(addUtcDays(viewStart, -NUM_DAYS)) });
  const nextHref = href({ from: iso(addUtcDays(viewStart, NUM_DAYS)) });

  let rows: ChessRow[] = [];
  let hiddenCount = 0;
  let rcInfo: string | null = null;

  if (tab === "cars") {
    const [allCars, bookingsRaw] = await Promise.all([
      prisma.car.findMany({ orderBy: [{ make: "asc" }, { model: "asc" }], select: { id: true, make: true, model: true, slug: true, active: true, isTest: true, pricePerDayRub: true } }),
      prisma.booking.findMany({
        where: bookingsOverlappingRangeWhere(viewStart, viewEnd),
        include: {
          user: { select: { email: true, firstName: true, lastName: true, patronymic: true, phone: true } },
        },
        orderBy: { startDate: "asc" },
      }),
    ]);
    // сквозной номер: у каждой брони машины есть карточка аренды (Deal.siteBookingId)
    const carDeals = await prisma.deal.findMany({ where: { siteBookingId: { in: bookingsRaw.map((b) => b.id) } }, select: { id: true, number: true, siteBookingId: true } });
    const dealByBooking = new Map(carDeals.map((d) => [d.siteBookingId as string, d]));
    const isHidden = (c: { active: boolean; isTest: boolean }) => !c.active || c.isTest;
    hiddenCount = allCars.filter(isHidden).length;
    const cars = showHidden ? allCars : allCars.filter((c) => !isHidden(c));
    rows = cars.map((car) => ({
      id: car.id,
      title: `${car.make} ${car.model}${car.isTest ? " (тест)" : !car.active ? " (скрыт)" : ""}`,
      subtitle: "На сайте",
      subtitleHref: `/cars/${car.slug}`,
      muted: isHidden(car),
      cell: compactRub(car.pricePerDayRub),
      bars: bookingsRaw
        .filter((b) => b.carId === car.id)
        .map<ChessBar>((b) => {
          const label = formatBookingGuestLabel(b);
          const phoneVal = bookingGuestPhone(b);
          const phone = phoneVal ? ` · ${phoneVal}` : "";
          const messenger = b.guestMessenger?.trim() ? b.guestMessenger.trim() : null;
          const back = `/admin-panel/bookings?from=${encodeURIComponent(fromStr)}`;
          const cd = dealByBooking.get(b.id);
          return {
            id: b.id,
            start: iso(b.startDate),
            end: iso(b.endDate),
            halfDay: false,
            color: barColor(b.status),
            label: `${cd ? `№${cd.number} ` : b.isTest ? "тест · " : ""}${label}${phone}`,
            title: `${label}${phone} · ${rd(iso(b.startDate))}–${rd(iso(b.endDate))}`,
            href: `/admin-panel/orders/${b.id}/edit?back=${encodeURIComponent(back)}`,
            info: {
              subtitle: cd ? `Бронь №${cd.number} · заказ · ${car.make} ${car.model}` : `${b.isTest ? "Тестовый заказ" : "Заказ"} · ${car.make} ${car.model}`,
              title: label,
              lines: [
                ["Даты", `${rd(iso(b.startDate))}.${iso(b.startDate).slice(0, 4)} – ${rd(iso(b.endDate))}.${iso(b.endDate).slice(0, 4)}`],
                ["Телефон", phoneVal ?? "—"],
                ["Мессенджер", messenger ?? "—"],
                ["Статус оплаты", b.status === "PAID" ? "оплачен" : b.status === "PARTIALLY_PAID" ? "оплачен частично" : b.status === "PENDING_PAYMENT" ? "не оплачен" : String(b.status)],
              ],
              link: cd
                ? { href: `/admin-panel/accounting/deals/${cd.id}`, label: "Открыть карточку аренды (оплаты, расходы)" }
                : { href: `/admin-panel/orders/${b.id}/edit?back=${encodeURIComponent(back)}`, label: "Открыть заказ" },
            },
          };
        }),
    }));
  } else {
    const [assets, deals, lastRun] = await Promise.all([
      prisma.asset.findMany({ where: { kind: "APARTMENT", active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
      prisma.deal.findMany({
        where: { status: "ACTIVE", startDate: { lte: viewEnd }, endDate: { gte: viewStart }, asset: { kind: "APARTMENT" } },
        select: {
          id: true, number: true, assetId: true, guestName: true, phone: true, startDate: true, endDate: true, grossKop: true, commissionKop: true,
          comment: true, rcBookingId: true, rcMissingSince: true, channel: { select: { name: true } },
          changes: { orderBy: { at: "desc" }, take: 6, select: { at: true, text: true } },
        },
        orderBy: { startDate: "asc" },
      }),
      prisma.rcSyncRun.findFirst({ where: { status: "ok" }, orderBy: { startedAt: "desc" } }),
    ]);
    const totals = await getDealTotals(deals.map((d) => d.id));
    const rc = (lastRun?.result as RcRunSummary | null | undefined) ?? null;
    const rcOnly = (rc?.missing ?? []).filter((m) => m.assetId && m.end >= days[0] && m.begin <= days[days.length - 1]);
    if (lastRun) {
      rcInfo = `${rcOnly.length ? `${rcOnly.length} броней только в RealtyCalendar · ` : ""}данные RC на ${lastRun.startedAt.toLocaleString("ru-RU", { timeZone: "Europe/Moscow", dateStyle: "short", timeStyle: "short" })}`;
    }

    rows = assets.map((a) => ({
      id: a.id,
      title: a.name,
      bars: [
        ...deals
          .filter((d) => d.assetId === a.id)
          .map<ChessBar>((d) => {
            const paid = totals.get(d.id)?.paidKop ?? 0;
            const color = paid >= d.grossKop ? GREEN : paid > 0 ? BLUE : ORANGE;
            const s = iso(d.startDate);
            const e = iso(d.endDate);
            const nights = Math.round((d.endDate.getTime() - d.startDate.getTime()) / 86400000);
            const lost = !!d.rcMissingSince;
            const stamp = (t: Date) => t.toLocaleString("ru-RU", { timeZone: "Europe/Moscow", dateStyle: "short", timeStyle: "short" });
            const rcNo = d.rcBookingId ? `RC${d.rcBookingId}` : null;
            return {
              id: d.id,
              start: s,
              end: e,
              halfDay: true,
              color,
              dashed: lost,
              info: {
                subtitle: `Бронь №${d.number}${rcNo ? ` · RealtyCalendar №${d.rcBookingId}` : " · внесена вручную"}`,
                title: d.guestName,
                warning: lost ? `Брони нет в RealtyCalendar (пропала ${stamp(d.rcMissingSince as Date)}). Проверьте, не отменена ли она.` : undefined,
                lines: [
                  ["Объект", a.name],
                  ["Даты", `${rd(s)}.${s.slice(0, 4)} – ${rd(e)}.${e.slice(0, 4)} (${nights} ноч.)`],
                  ["Номер RC", d.rcBookingId ? String(d.rcBookingId) : "нет (внесена вручную)"],
                  ["Телефон", d.phone ?? "—"],
                  ["Площадка", d.channel?.name ?? "напрямую"],
                  ["Сумма", `${Math.round(d.grossKop / 100).toLocaleString("ru-RU")} ₽`],
                  ["Комиссия", `${Math.round(d.commissionKop / 100).toLocaleString("ru-RU")} ₽`],
                  ["Оплачено", `${Math.round(paid / 100).toLocaleString("ru-RU")} ₽ (осталось ${Math.round(Math.max(d.grossKop - paid, 0) / 100).toLocaleString("ru-RU")} ₽)`],
                  ...(d.comment ? ([["Комментарий", d.comment]] as [string, string][]) : []),
                ],
                history: d.changes.map((c) => `${stamp(c.at)} — ${c.text}`),
                link: { href: `/admin-panel/accounting/deals/${d.id}`, label: "Открыть полную карточку" },
              },
              label: `№${d.number}${rcNo ? ` ${rcNo}` : ""} ${d.guestName}${lost ? " ⚠" : ""}`,
              title: `Заезд №${d.number}${rcNo ? ` · ${rcNo}` : ""} · ${d.guestName} · ${rd(s)}–${rd(e)}${d.channel ? ` · ${d.channel.name}` : ""} · оплачено ${Math.round(paid / 100)} из ${Math.round(d.grossKop / 100)} ₽`,
              href: `/admin-panel/accounting/deals/${d.id}`,
            };
          }),
        ...rcOnly
          .filter((m) => m.assetId === a.id)
          .map<ChessBar>((m) => ({
            id: `rc${m.rcId}`,
            info: {
              subtitle: `Бронь только в RealtyCalendar №${m.rcId}`,
              title: m.guest || "Гость не указан",
              warning: "В Пальме по этой брони нет заезда (например, пересекается с другим заездом). Решите на странице сверки.",
              lines: [
                ["Объект", a.name],
                ["Даты", `${rd(m.begin)}.${m.begin.slice(0, 4)} – ${rd(m.end)}.${m.end.slice(0, 4)}`],
                ["Номер RC", String(m.rcId)],
                ["Телефон", m.phone || "—"],
                ["Источник", m.source || "—"],
                ["Сумма", `${Math.round(m.amountKop / 100).toLocaleString("ru-RU")} ₽`],
                ["Оплачено в RC", `${Math.round(m.paidKop / 100).toLocaleString("ru-RU")} ₽`],
              ],
              link: { href: "/admin-panel/accounting/rc", label: "Перейти к сверке" },
            },
            start: m.begin,
            end: m.end,
            halfDay: true,
            color: "color-mix(in srgb, var(--color-accent) 12%, var(--color-bg))",
            textColor: "var(--color-text)",
            dashed: true,
            label: `RC${m.rcId} · ${m.guest || "гость"}`,
            title: `Только в RealtyCalendar №${m.rcId}: ${m.guest || "гость не указан"} · ${rd(m.begin)}–${rd(m.end)}${m.source ? ` · ${m.source}` : ""}`,
            href: "/admin-panel/accounting/rc",
          })),
      ],
    }));
  }

  const pill = (active: boolean): React.CSSProperties => ({
    padding: "0.4rem 0.9rem",
    borderRadius: "999px",
    border: active ? "2px solid var(--color-accent)" : "1px solid var(--color-border)",
    background: active ? "var(--color-surface)" : "transparent",
    color: "var(--color-text)",
    fontWeight: active ? 700 : 400,
    fontSize: "var(--text-sm)",
    textDecoration: "none",
  });
  const navBtn: React.CSSProperties = { padding: "0.4rem 0.8rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", fontSize: "var(--text-sm)", textDecoration: "none", color: "var(--color-text)" };
  const primary: React.CSSProperties = { ...pill(false), background: "var(--color-accent)", color: "#fff", fontWeight: 600, border: "none" };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0.5rem 0 0" }}>Шахматка</h1>
        <Link href={href({ tab: "cars" })} style={pill(tab === "cars")}>
          Машины
        </Link>
        <Link href={href({ tab: "apts" })} style={pill(tab === "apts")}>
          Квартиры
        </Link>
        <span style={{ flex: 1 }} />
        {tab === "cars" ? (
          <Link href="/admin-panel/bookings/new" style={primary}>
            Новая бронь
          </Link>
        ) : (
          <Link href="/admin-panel/accounting/deals/new" style={primary}>
            Новый заезд
          </Link>
        )}
        <Link href={prevHref} style={navBtn}>
          ← Назад
        </Link>
        <Link href={nextHref} style={navBtn}>
          Вперёд →
        </Link>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.8rem", margin: "0 0 0.6rem", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
        <span>
          {days[0].split("-").reverse().join(".")} — {days[days.length - 1].split("-").reverse().join(".")}
        </span>
        <span>
          <b style={{ color: GREEN }}>■</b> оплачено · <b style={{ color: BLUE }}>■</b> частично · <b style={{ color: ORANGE }}>■</b> не оплачено
          {tab === "apts" ? " · пунктир — брони уже нет в RealtyCalendar (или она есть только там)" : ""}. Нажмите на полоску — откроется карточка брони.
        </span>
        {tab === "cars" ? (
          <Link
            href={href({ hidden: showHidden ? undefined : "1" })}
            style={{ ...pill(showHidden), fontSize: "var(--text-xs)", padding: "0.25rem 0.7rem" }}
            title="Скрытые на сайте и тестовые (демо) машины по умолчанию не показываются"
          >
            {showHidden ? "☑" : "☐"} Показывать скрытые и тестовые машины{hiddenCount ? ` (${hiddenCount})` : ""}
          </Link>
        ) : null}
        {tab === "apts" && rcInfo ? (
          <Link href="/admin-panel/accounting/rc" style={{ color: "var(--color-text-secondary)" }}>
            {rcInfo}
          </Link>
        ) : null}
      </div>

      <Chessboard days={days} today={iso(today)} rows={rows} />
    </div>
  );
}
