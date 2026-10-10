import type { RcEvent } from "@/lib/rc-client";

/**
 * Сверка броней RealtyCalendar с нашими заездами. Чистая функция (без доступа к сети и базе) — её удобно проверять.
 * Ничего не пишет: возвращает отчёт и список «безопасных» связей (точное совпадение объекта и дат), которые ставит вызывающий код.
 */

export type OurAsset = { id: string; name: string; rcName: string | null };
export type OurChannel = { id: string; name: string };
export type OurDeal = {
  id: string;
  number: number;
  assetId: string;
  assetName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  guestName: string;
  grossKop: number;
  paidKop: number;
  rcBookingId: number | null;
};

export type RcRow = {
  rcId: number;
  begin: string;
  end: string;
  address: string;
  assetId: string | null;
  assetName: string | null;
  guest: string;
  phone: string;
  source: string;
  channelId: string | null;
  amountKop: number;
  paidKop: number;
};

export type DifferRow = {
  rc: RcRow;
  deal: { id: string; number: number; guestName: string; startDate: string; endDate: string; grossKop: number };
  problems: string[];
};

export type ReconcileResult = {
  summary: { rcEvents: number; ourDeals: number; matched: number; paidDiffer: number; missing: number; differs: number; onlyOurs: number; unmappedEvents: number; autoLinked: number };
  missing: RcRow[];
  differs: DifferRow[];
  onlyOurs: { dealId: string; number: number; assetName: string; guestName: string; startDate: string; endDate: string; grossKop: number }[];
  paidDiffer: { rc: RcRow; dealNumber: number; dealPaidKop: number }[];
  unmapped: { address: string; count: number }[];
  /** Безопасные связи: заезд ↔ бронь RC, найденные по объекту и точным датам (ставятся автоматически). */
  autoLinks: { dealId: string; rcId: number }[];
};

export const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

const toKop = (rub: number) => Math.round((Number(rub) || 0) * 100);
const tokens = (s: string) => new Set(norm(s).replace(/[^a-zа-яё0-9 ]/gi, " ").split(" ").filter((t) => t.length > 1));
const sameGuest = (a: string, b: string) => {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return true; // нечего сравнивать — не считаем расхождением
  for (const t of ta) if (tb.has(t)) return true;
  return false;
};

/** Название источника в RealtyCalendar -> название нашей площадки. */
export function mapSource(name: string | null | undefined): string | null {
  const n = norm(name);
  if (!n || n === "корзина" || n.includes("модуль") || n.includes("прям")) return "Прямые бронирования";
  if (n.includes("ostrovok") || n.includes("островок")) return "Островок";
  if (n.includes("sutochno") || n.includes("суточно")) return "Суточно";
  if (n.includes("tvil") || n.includes("твил")) return "Твил";
  if (n.includes("privet") || n.includes("привет")) return "ПриветТур";
  if (n.includes("forento") || n.includes("форенто")) return "Форенто";
  if (n.includes("avito") || n.includes("авито")) return "Авито";
  if (n.includes("yandex") || n.includes("яндекс")) return "Яндекс Путешествия";
  return null;
}

export function reconcile(input: { events: RcEvent[]; deals: OurDeal[]; assets: OurAsset[]; channels: OurChannel[]; from: string; to: string }): ReconcileResult {
  const { events, deals, assets, channels, from, to } = input;

  // RC-имена объектов -> наш объект (rcName может содержать несколько названий, по одному в строке)
  const assetByRc = new Map<string, OurAsset>();
  for (const a of assets) for (const n of (a.rcName ?? "").split("\n")) if (norm(n)) assetByRc.set(norm(n), a);
  const channelByName = new Map(channels.map((c) => [norm(c.name), c.id]));

  const rows: RcRow[] = events
    .filter((e) => e.end_date >= from && e.begin_date <= to)
    .map((e) => {
      const a = assetByRc.get(norm(e.address)) ?? null;
      const ch = mapSource(e.source?.name);
      return {
        rcId: e.id,
        begin: e.begin_date,
        end: e.end_date,
        address: (e.address ?? "").replace(/\s+/g, " ").trim(),
        assetId: a?.id ?? null,
        assetName: a?.name ?? null,
        guest: e.client_name ?? "",
        phone: e.client_phone ?? "",
        source: e.source?.name ?? "",
        channelId: ch ? (channelByName.get(norm(ch)) ?? null) : null,
        amountKop: toKop(e.amount),
        paidKop: toKop(e.prepayment),
      };
    });

  const mappedAssetIds = new Set(assets.filter((a) => a.rcName && norm(a.rcName)).map((a) => a.id));
  const ourInRange = deals.filter((d) => d.endDate >= from && d.startDate <= to && mappedAssetIds.has(d.assetId));
  const byRcId = new Map(deals.filter((d) => d.rcBookingId !== null).map((d) => [d.rcBookingId as number, d]));
  const free = deals.filter((d) => d.rcBookingId === null);
  const byKey = new Map<string, OurDeal[]>();
  for (const d of free) {
    const k = `${d.assetId}|${d.startDate}|${d.endDate}`;
    byKey.set(k, [...(byKey.get(k) ?? []), d]);
  }

  const res: ReconcileResult = {
    summary: { rcEvents: rows.length, ourDeals: ourInRange.length, matched: 0, paidDiffer: 0, missing: 0, differs: 0, onlyOurs: 0, unmappedEvents: 0, autoLinked: 0 },
    missing: [], differs: [], onlyOurs: [], paidDiffer: [], unmapped: [], autoLinks: [],
  };
  const used = new Set<string>();
  const unmapped = new Map<string, number>();

  for (const r of rows) {
    if (!r.assetId) {
      unmapped.set(r.address, (unmapped.get(r.address) ?? 0) + 1);
      res.summary.unmappedEvents++;
      continue;
    }

    let deal = byRcId.get(r.rcId) ?? null;
    let linkedNow = false;
    if (!deal) {
      const cands = (byKey.get(`${r.assetId}|${r.begin}|${r.end}`) ?? []).filter((d) => !used.has(d.id));
      const pick = cands.find((d) => sameGuest(d.guestName, r.guest)) ?? (cands.length === 1 ? cands[0] : null);
      if (pick) {
        deal = pick;
        linkedNow = true;
      }
    }

    if (!deal) {
      // нет заезда с такими же датами; возможно, у нас он есть, но с другими датами
      const overlap = ourInRange.find((d) => d.assetId === r.assetId && !used.has(d.id) && d.rcBookingId === null && d.startDate < r.end && r.begin < d.endDate);
      if (overlap) {
        used.add(overlap.id);
        res.differs.push({ rc: r, deal: pick4(overlap), problems: [`даты: у нас ${overlap.startDate}–${overlap.endDate}, в RC ${r.begin}–${r.end}`, ...(Math.abs(overlap.grossKop - r.amountKop) >= 100 ? [`сумма: у нас ${overlap.grossKop / 100}, в RC ${r.amountKop / 100}`] : [])] });
        res.summary.differs++;
      } else {
        res.missing.push(r);
        res.summary.missing++;
      }
      continue;
    }

    used.add(deal.id);
    const problems: string[] = [];
    if (deal.startDate !== r.begin || deal.endDate !== r.end) problems.push(`даты: у нас ${deal.startDate}–${deal.endDate}, в RC ${r.begin}–${r.end}`);
    if (Math.abs(deal.grossKop - r.amountKop) >= 100) problems.push(`сумма: у нас ${deal.grossKop / 100} ₽, в RC ${r.amountKop / 100} ₽`);
    if (!sameGuest(deal.guestName, r.guest)) problems.push(`гость: у нас «${deal.guestName}», в RC «${r.guest}»`);
    if (deal.assetId !== r.assetId) problems.push(`объект: у нас «${deal.assetName}», в RC «${r.assetName}»`);

    if (problems.length > 0) {
      res.differs.push({ rc: r, deal: pick4(deal), problems });
      res.summary.differs++;
    } else {
      res.summary.matched++;
      if (linkedNow) {
        res.autoLinks.push({ dealId: deal.id, rcId: r.rcId });
        res.summary.autoLinked++;
      }
      if (Math.abs(deal.paidKop - r.paidKop) >= 100) {
        res.paidDiffer.push({ rc: r, dealNumber: deal.number, dealPaidKop: deal.paidKop });
        res.summary.paidDiffer++;
      }
    }
  }

  for (const d of ourInRange) {
    if (used.has(d.id)) continue;
    res.onlyOurs.push({ dealId: d.id, number: d.number, assetName: d.assetName, guestName: d.guestName, startDate: d.startDate, endDate: d.endDate, grossKop: d.grossKop });
    res.summary.onlyOurs++;
  }
  res.unmapped = [...unmapped.entries()].map(([address, count]) => ({ address, count })).sort((a, b) => b.count - a.count);
  return res;
}

function pick4(d: OurDeal) {
  return { id: d.id, number: d.number, guestName: d.guestName, startDate: d.startDate, endDate: d.endDate, grossKop: d.grossKop };
}
