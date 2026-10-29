import { Prisma } from "@prisma/client";

import { REFUND_CATEGORY } from "@/lib/accounting";
import { BONUS_PCT } from "@/lib/accounting-agreements";
import { formatKop } from "@/lib/money";
import { prisma } from "@/lib/prisma";

/**
 * Отчёты учёта. Во всех отчётах НЕ учитываются: аннулированные операции, операции с пометкой «проверить»
 * (до решения человека), служебные статьи «Служебное: …» (получение денег — это не доход), перемещения и сдачи в Рубин.
 * Перенесённая из старой истории (isImported) учитывается: отчёты строятся и по истории, и по новым операциям.
 */

export type Cell = string | { kop: number } | { pct: number | null };

export type ReportTable = {
  title: string;
  notes: string[];
  headers: string[];
  rows: Cell[][];
  /** Номера строк, выделяемых жирным (итоги). */
  bold: number[];
  /** Сколько операций «проверить» не вошло в отчёт за период. */
  excludedReview: number;
};

export type ReportKind = "objects" | "months" | "owners" | "cash" | "bonus";

export const REPORT_TITLES: Record<ReportKind, string> = {
  objects: "Результаты по объектам",
  months: "Результаты по месяцам",
  owners: "Расчёт с собственником",
  cash: "Движение по кассам",
  bonus: "Премии сотрудников",
};

// ----------------------------------------------------------------------------- период

export type Period = { from: Date; to: Date; fromStr: string; toStr: string; label: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

export function parsePeriod(sp: { from?: string; to?: string; preset?: string }, today = new Date()): Period {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const valid = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? new Date(`${s}T00:00:00.000Z`) : null);
  const f = valid(sp.from);
  const t = valid(sp.to);
  if (f && t && f <= t) return { from: f, to: t, fromStr: iso(f), toStr: iso(t), label: `${iso(f)} — ${iso(t)}` };

  let from: Date, to: Date, label: string;
  switch (sp.preset) {
    case "cur":
      [from, to, label] = [utc(y, m, 1), utc(y, m + 1, 0), "этот месяц"];
      break;
    case "ytd":
      [from, to, label] = [utc(y, 0, 1), utc(y, m + 1, 0), "с начала года"];
      break;
    case "all":
      [from, to, label] = [utc(2024, 5, 1), utc(y, m + 1, 0), "за всё время"];
      break;
    default:
      [from, to, label] = [utc(y, m - 1, 1), utc(y, m, 0), "прошлый месяц"];
  }
  return { from, to, fromStr: iso(from), toStr: iso(to), label };
}

function monthsBetween(from: Date, to: Date): string[] {
  const out: string[] = [];
  let y = from.getUTCFullYear();
  let m = from.getUTCMonth();
  while (y < to.getUTCFullYear() || (y === to.getUTCFullYear() && m <= to.getUTCMonth())) {
    out.push(`${y}-${String(m + 1).padStart(2, "0")}`);
    m++;
    if (m > 11) [y, m] = [y + 1, 0];
  }
  return out;
}

// ----------------------------------------------------------------------------- данные

type Fact = { assetId: string | null; categoryId: string; month: string; type: "INCOME" | "EXPENSE"; kop: number };

async function loadFacts(p: Period, assetId?: string): Promise<{ facts: Fact[]; excludedReview: number }> {
  const assetFilter = assetId ? Prisma.sql`AND o.asset_id = ${assetId}` : Prisma.empty;
  const rows = await prisma.$queryRaw<{ asset_id: string | null; category_id: string; m: string; t: string; s: bigint }[]>(Prisma.sql`
    SELECT o.asset_id, o.category_id, to_char(o.date, 'YYYY-MM') m, o.type::text t, SUM(o.amount_kop)::bigint s
    FROM operations o JOIN categories c ON c.id = o.category_id
    WHERE o.voided_at IS NULL AND NOT o.needs_review AND o.type IN ('INCOME', 'EXPENSE')
      AND o.date >= CAST(${p.fromStr} AS date) AND o.date <= CAST(${p.toStr} AS date) AND c.name NOT LIKE 'Служебное:%' ${assetFilter}
    GROUP BY 1, 2, 3, 4`);
  const excluded = await prisma.operation.count({
    where: { voidedAt: null, needsReview: true, type: { in: ["INCOME", "EXPENSE"] }, date: { gte: p.from, lte: p.to }, ...(assetId ? { assetId } : {}) },
  });
  return {
    facts: rows.map((r) => ({ assetId: r.asset_id, categoryId: r.category_id, month: r.m, type: r.t as Fact["type"], kop: Number(r.s) })),
    excludedReview: excluded,
  };
}

/** Склонение по числу: 1 операция, 2 операции, 5 операций. */
const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10;
  const m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};

const reviewNote = (n: number) =>
  n > 0 ? [`Не вошло в отчёт: ${n} ${plural(n, "операция", "операции", "операций")} с пометкой «проверить» за этот период (журнал → «только проверить»).`] : [];

// ----------------------------------------------------------------------------- результаты (по объектам / по месяцам)

export async function buildResults(kind: "objects" | "months", p: Period, opts: { assetId?: string; alloc?: boolean } = {}): Promise<ReportTable> {
  const [{ facts, excludedReview }, cats, assets] = await Promise.all([
    loadFacts(p, opts.assetId),
    prisma.category.findMany({ select: { id: true, name: true, kind: true, nature: true, sortOrder: true } }),
    prisma.asset.findMany({ select: { id: true, name: true, kind: true, sortOrder: true } }),
  ]);
  const cat = new Map(cats.map((c) => [c.id, c]));
  const ast = new Map(assets.map((a) => [a.id, a]));
  const NONE = "_none";

  // колонки
  let colKeys: string[];
  let colLabel: (k: string) => string;
  const colOf = (f: Fact) => (kind === "objects" ? (f.assetId ?? NONE) : f.month);
  if (kind === "objects") {
    const used = new Set(facts.map((f) => f.assetId ?? NONE));
    colKeys = assets
      .filter((a) => used.has(a.id))
      .sort((a, b) => (a.kind === b.kind ? a.sortOrder - b.sortOrder : a.kind === "APARTMENT" ? -1 : 1))
      .map((a) => a.id);
    if (used.has(NONE)) colKeys.push(NONE);
    colLabel = (k) => (k === NONE ? "Без объекта (общие)" : (ast.get(k)?.name ?? k));
  } else {
    colKeys = monthsBetween(p.from, p.to);
    colLabel = (k) => k;
  }

  // матрица: категория -> колонка -> копейки (у расходов и доходов отдельные строки по категории)
  const m = new Map<string, Map<string, number>>();
  const add = (cid: string, col: string, kop: number) => {
    const row = m.get(cid) ?? new Map<string, number>();
    row.set(col, (row.get(col) ?? 0) + kop);
    m.set(cid, row);
  };
  for (const f of facts) add(f.categoryId, colOf(f), f.type === "EXPENSE" && cat.get(f.categoryId)?.kind === "INCOME" ? -f.kop : f.kop);

  // распределение общих расходов поровну между объектами с выручкой (по желанию)
  const notes: string[] = [];
  if (kind === "objects" && opts.alloc && colKeys.includes(NONE)) {
    const incomeCols = colKeys.filter((c) => c !== NONE && [...m.entries()].some(([cid, row]) => cat.get(cid)?.kind === "INCOME" && (row.get(c) ?? 0) > 0));
    if (incomeCols.length > 0) {
      for (const [cid, row] of m) {
        if (cat.get(cid)?.kind !== "EXPENSE") continue;
        const total = row.get(NONE) ?? 0;
        if (!total) continue;
        const base = Math.floor(total / incomeCols.length);
        let rest = total - base * incomeCols.length;
        for (const c of incomeCols) {
          row.set(c, (row.get(c) ?? 0) + base + (rest-- > 0 ? 1 : 0));
        }
        row.delete(NONE);
      }
      colKeys = colKeys.filter((c) => c !== NONE);
      notes.push(`Общие расходы («без объекта») распределены поровну между ${incomeCols.length} объектами с выручкой за период.`);
    } else {
      notes.push("В периоде нет объектов с выручкой — общие расходы не распределены.");
    }
  }

  const cols = [...colKeys];
  const rowKop = (cid: string, c: string) => m.get(cid)?.get(c) ?? 0;
  const sumRows = (ids: string[], c: string) => ids.reduce((s, id) => s + rowKop(id, c), 0);
  const present = [...m.keys()].map((id) => cat.get(id)).filter((c): c is NonNullable<typeof c> => !!c);
  const byOrder = (a: { sortOrder: number; name: string }, b: { sortOrder: number; name: string }) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ru");
  const refundId = cats.find((c) => c.name === REFUND_CATEGORY)?.id;
  const inc = present.filter((c) => c.kind === "INCOME").sort(byOrder);
  // возврат клиенту — не расход: показывается в доходах со знаком минус
  const expVar = present.filter((c) => c.kind === "EXPENSE" && c.nature === "VARIABLE" && c.id !== refundId).sort(byOrder);
  const expFix = present.filter((c) => c.kind === "EXPENSE" && c.nature === "FIXED" && c.id !== refundId).sort(byOrder);
  const refundOf = (col: string) => (refundId ? rowKop(refundId, col) : 0);

  const rows: Cell[][] = [];
  const bold: number[] = [];
  const line = (label: string, f: (c: string) => number, strong = false) => {
    const cells: Cell[] = cols.map((c) => ({ kop: f(c) }));
    cells.push({ kop: cols.reduce((s, c) => s + f(c), 0) });
    rows.push([label, ...cells]);
    if (strong) bold.push(rows.length - 1);
  };
  const section = (label: string) => {
    rows.push([label, ...cols.map(() => ""), ""]);
    bold.push(rows.length - 1);
  };

  section("Доходы");
  for (const c of inc) line(c.name, (col) => rowKop(c.id, col));
  const incIds = inc.map((c) => c.id);
  const incomeOf = (col: string) => sumRows(incIds, col) - refundOf(col);
  if (refundId && cols.some((c) => refundOf(c) !== 0)) line("Возвраты клиентам", (col) => -refundOf(col));
  line("Итого доходов", incomeOf, true);
  section("Расходы переменные (к заезду / аренде)");
  for (const c of expVar) line(c.name, (col) => rowKop(c.id, col));
  const varIds = expVar.map((c) => c.id);
  line("Итого переменных", (col) => sumRows(varIds, col), true);
  section("Расходы постоянные");
  for (const c of expFix) line(c.name, (col) => rowKop(c.id, col));
  const fixIds = expFix.map((c) => c.id);
  line("Итого постоянных", (col) => sumRows(fixIds, col), true);
  line("Всего расходов", (col) => sumRows([...varIds, ...fixIds], col), true);
  line("Результат (доходы − расходы)", (col) => incomeOf(col) - sumRows([...varIds, ...fixIds], col), true);
  const pcts: Cell[] = [...cols, "_total"].map((col) => {
    const i = col === "_total" ? cols.reduce((s, c) => s + incomeOf(c), 0) : incomeOf(col);
    const e = col === "_total" ? cols.reduce((s, c) => s + sumRows([...varIds, ...fixIds], c), 0) : sumRows([...varIds, ...fixIds], col);
    return { pct: i > 0 ? (e / i) * 100 : null };
  });
  rows.push(["Расходы, % от доходов", ...pcts]);

  // Выведено собственнику-компании: перемещения в «Кассу Рубина» за период (не расход — показываем под результатом)
  if (!opts.assetId) {
    const out = await prisma.$queryRaw<{ m: string; s: bigint }[]>(Prisma.sql`
      SELECT to_char(o.date, 'YYYY-MM') m, SUM(o.amount_kop)::bigint s
      FROM operations o JOIN cash_accounts a ON a.id = o.to_account_id
      WHERE o.voided_at IS NULL AND o.type = 'TRANSFER' AND a.name = ${OWNER_CASH_ACCOUNT}
        AND o.date >= CAST(${p.fromStr} AS date) AND o.date <= CAST(${p.toStr} AS date)
      GROUP BY 1`);
    const byMonth = new Map(out.map((r) => [r.m, Number(r.s)]));
    const total = [...byMonth.values()].reduce((s, v) => s + v, 0);
    if (total > 0) {
      const cells: Cell[] = cols.map((c) => (kind === "months" ? { kop: byMonth.get(c) ?? 0 } : ""));
      rows.push([`Выведено собственнику (перемещения в «${OWNER_CASH_ACCOUNT}»)`, ...cells, { kop: total }]);
      notes.push("«Выведено собственнику» — деньги, сданные собственнику-компании (перемещения в «Кассу Рубина»); это не расход и в результат не входит.");
    }
  }

  if (opts.assetId && ast.get(opts.assetId)) notes.unshift(`Только объект «${ast.get(opts.assetId)!.name}».`);
  return {
    title: `${REPORT_TITLES[kind]} · ${p.label}`,
    notes: [...notes, "Доходы и расходы по статьям. Результат = доходы − все расходы, включая выплаты собственнику.", ...reviewNote(excludedReview)],
    headers: ["Статья", ...cols.map(colLabel), "Итого"],
    rows,
    bold,
    excludedReview,
  };
}

// ----------------------------------------------------------------------------- расчёт с собственником

export const OWNER_PAYOUT_CATEGORY = "Выплата собственнику (аренда помещений)";
/** Касса собственника-компании: сдача денег туда = «выведено собственнику». */
const OWNER_CASH_ACCOUNT = "Касса Рубина";
const COMMISSION_CATEGORY = "Комиссия агрегатора";

/** К выплате = доля × (доход − комиссия агрегатора). Фактические выплаты берутся из операций по статье выплаты собственнику. */
export async function buildOwners(p: Period): Promise<ReportTable> {
  const owned = await prisma.asset.findMany({ where: { ownerName: { not: null } }, select: { id: true, name: true, ownerName: true, ownerSharePct: true }, orderBy: { name: "asc" } });
  const months = monthsBetween(p.from, p.to);
  const headers = ["Объект", "Собственник", "Месяц", "Доход", "Комиссия агрегатора", "Нетто", "Доля, %", "К выплате", "Выплачено", "Разница (к выплате − выплачено)"];
  const rows: Cell[][] = [];
  const bold: number[] = [];
  let excluded = 0;
  for (const a of owned) {
    const { facts, excludedReview } = await loadFacts(p, a.id);
    excluded += excludedReview;
    const cats = await prisma.category.findMany({ where: { name: { in: [COMMISSION_CATEGORY, OWNER_PAYOUT_CATEGORY, REFUND_CATEGORY] } }, select: { id: true, name: true } });
    const commId = cats.find((c) => c.name === COMMISSION_CATEGORY)?.id;
    const refId = cats.find((c) => c.name === REFUND_CATEGORY)?.id;
    const payId = cats.find((c) => c.name === OWNER_PAYOUT_CATEGORY)?.id;
    let tI = 0, tC = 0, tD = 0, tP = 0;
    for (const mo of months) {
      const fm = facts.filter((f) => f.month === mo);
      const income =
        fm.filter((f) => f.type === "INCOME").reduce((s, f) => s + f.kop, 0) - fm.filter((f) => f.type === "EXPENSE" && f.categoryId === refId).reduce((s, f) => s + f.kop, 0);
      const comm = fm.filter((f) => f.categoryId === commId && f.type === "EXPENSE").reduce((s, f) => s + f.kop, 0);
      const paid = fm.filter((f) => f.categoryId === payId && f.type === "EXPENSE").reduce((s, f) => s + f.kop, 0);
      if (!income && !comm && !paid) continue;
      const net = income - comm;
      const due = Math.round((net * a.ownerSharePct) / 100);
      rows.push([a.name, a.ownerName ?? "", mo, { kop: income }, { kop: comm }, { kop: net }, String(a.ownerSharePct), { kop: due }, { kop: paid }, { kop: due - paid }]);
      tI += income; tC += comm; tD += due; tP += paid;
    }
    if (rows.length && rows[rows.length - 1][0] === a.name) {
      rows.push([`Итого: ${a.name}`, "", "", { kop: tI }, { kop: tC }, { kop: tI - tC }, "", { kop: tD }, { kop: tP }, { kop: tD - tP }]);
      bold.push(rows.length - 1);
    }
  }
  return {
    title: `${REPORT_TITLES.owners} · ${p.label}`,
    notes: [
      "К выплате = доля собственника × (доход − комиссия агрегатора). Положительная разница — выплатить ещё, отрицательная — выплачено больше расчётного.",
      "По истории разница ожидаема: в 2025 году выплата считалась как 70% от дохода без вычета комиссии, с 2026 — 65% от нетто.",
      ...(owned.length === 0 ? ["Нет объектов с внешним собственником (задаётся в «Справочники → Объекты»)."] : []),
      ...reviewNote(excluded),
    ],
    headers,
    rows,
    bold,
    excludedReview: excluded,
  };
}

// ----------------------------------------------------------------------------- движение по кассам

export async function buildCash(p: Period, includeImported: boolean): Promise<ReportTable> {
  const imp = includeImported ? Prisma.empty : Prisma.sql`AND NOT o.is_imported`;
  const [accounts, rows, tin] = await Promise.all([
    prisma.cashAccount.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.$queryRaw<{ a: string; t: string; s: bigint }[]>(Prisma.sql`
      SELECT o.account_id a, o.type::text t, SUM(o.amount_kop)::bigint s FROM operations o
      WHERE o.voided_at IS NULL AND o.date >= CAST(${p.fromStr} AS date) AND o.date <= CAST(${p.toStr} AS date) ${imp} GROUP BY 1, 2`),
    prisma.$queryRaw<{ a: string; s: bigint }[]>(Prisma.sql`
      SELECT o.to_account_id a, SUM(o.amount_kop)::bigint s FROM operations o
      WHERE o.voided_at IS NULL AND o.type = 'TRANSFER' AND o.to_account_id IS NOT NULL AND o.date >= CAST(${p.fromStr} AS date) AND o.date <= CAST(${p.toStr} AS date) ${imp} GROUP BY 1`),
  ]);
  const g = (a: string, t: string) => Number(rows.find((r) => r.a === a && r.t === t)?.s ?? 0);
  const out: Cell[][] = [];
  const tot = [0, 0, 0, 0, 0];
  for (const a of accounts) {
    const v = [g(a.id, "INCOME"), g(a.id, "EXPENSE"), g(a.id, "TRANSFER"), Number(tin.find((r) => r.a === a.id)?.s ?? 0), g(a.id, "HANDOVER")];
    if (v.every((x) => x === 0)) continue;
    out.push([a.name, ...v.map((kop) => ({ kop })), { kop: v[0] - v[1] - v[2] + v[3] - v[4] }]);
    v.forEach((x, i) => (tot[i] += x));
  }
  out.push(["Итого", ...tot.map((kop) => ({ kop })), { kop: tot[0] - tot[1] - tot[2] + tot[3] - tot[4] }]);
  return {
    title: `${REPORT_TITLES.cash} · ${p.label}`,
    notes: [
      includeImported
        ? "Включая перенесённую историю: кассы в ней определены по косвенным признакам, часть операций — в служебной кассе «Перенесённая история»."
        : "Только операции, внесённые в системе (перенесённая история не включена).",
      "Изменение = приходы − расходы − перемещено из + перемещено в − сдано в Рубин. Это движение за период, а не остаток.",
    ],
    headers: ["Касса", "Приходы", "Расходы", "Перемещено из кассы", "Перемещено в кассу", "Сдано в Рубин", "Изменение за период"],
    rows: out,
    bold: [out.length - 1],
    excludedReview: 0,
  };
}

// ----------------------------------------------------------------------------- премии сотрудников

const EXTRA_INCOME_CATEGORY = "Дополнительные доходы";
const DIRECT_CHANNEL = "Прямые бронирования";

/**
 * Комиссии сотрудников по таблице «Договорённости» (BONUS_PCT). Считаются по броням, месяц — по дате выезда.
 * Ева и Дима: квартиры 15% от нетто (+5% за прямую бронь, всего 20%), машины 10% от нетто, доп. доходы (трансфер) 5%.
 * Татьяна: 5% от брутто квартир и машин. Отменённые брони не считаются. «Выплачено» — расходы по статьям комиссий за месяц.
 */
export async function buildBonus(p: Period): Promise<ReportTable> {
  const [{ facts, excludedReview }, cats, deals, extra] = await Promise.all([
    loadFacts(p),
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.deal.findMany({
      where: { status: "ACTIVE", endDate: { gte: p.from, lte: p.to } },
      select: { endDate: true, grossKop: true, commissionKop: true, asset: { select: { kind: true } }, channel: { select: { name: true } } },
    }),
    // доп. доходы: месяц — по выезду брони, если операция к ней привязана, иначе по дате операции
    prisma.$queryRaw<{ m: string; s: bigint }[]>(Prisma.sql`
      SELECT to_char(COALESCE(d.end_date, o.date), 'YYYY-MM') m, SUM(o.amount_kop)::bigint s
      FROM operations o JOIN categories c ON c.id = o.category_id LEFT JOIN deals d ON d.id = o.deal_id
      WHERE o.voided_at IS NULL AND NOT o.needs_review AND o.type = 'INCOME' AND c.name = ${EXTRA_INCOME_CATEGORY}
        AND COALESCE(d.end_date, o.date) >= CAST(${p.fromStr} AS date) AND COALESCE(d.end_date, o.date) <= CAST(${p.toStr} AS date)
      GROUP BY 1`),
  ]);
  const id = (n: string) => cats.find((c) => c.name === n)?.id;
  const paidTat = id("Комиссионные Татьяны");
  const paidEd = id("Комиссионные Ева и Дима");
  const pct = (kop: number, rate: number) => Math.round((kop * rate) / 100);

  const headers = [
    "Месяц (по выезду)",
    "Броней",
    "Нетто квартир",
    "из них прямые",
    "Нетто машин",
    "Доп. доходы",
    "Брутто",
    "Ева и Дима: начислено",
    "Ева и Дима: выплачено",
    "Татьяна: начислено",
    "Татьяна: выплачено",
  ];
  const rows: Cell[][] = [];
  const t = new Array(10).fill(0) as number[];
  for (const mo of monthsBetween(p.from, p.to)) {
    const dm = deals.filter((d) => d.endDate.toISOString().slice(0, 7) === mo);
    const net = (d: (typeof dm)[number]) => d.grossKop - d.commissionKop;
    const isDirect = (d: (typeof dm)[number]) => !d.channel || d.channel.name === DIRECT_CHANNEL;
    const apt = dm.filter((d) => d.asset.kind === "APARTMENT");
    const aptNet = apt.reduce((s, d) => s + net(d), 0);
    const directNet = apt.filter(isDirect).reduce((s, d) => s + net(d), 0);
    const carNet = dm.filter((d) => d.asset.kind === "CAR").reduce((s, d) => s + net(d), 0);
    const gross = dm.reduce((s, d) => s + d.grossKop, 0);
    const extraKop = Number(extra.find((x) => x.m === mo)?.s ?? 0);
    const ed = pct(aptNet, BONUS_PCT.evaDimaApt) + pct(directNet, BONUS_PCT.evaDimaDirectExtra) + pct(carNet, BONUS_PCT.evaDimaCar) + pct(extraKop, BONUS_PCT.evaDimaExtra);
    const tat = pct(gross, BONUS_PCT.tatyana);
    const paid = (cid?: string) => facts.filter((f) => f.month === mo && f.type === "EXPENSE" && f.categoryId === cid).reduce((s, f) => s + f.kop, 0);
    const pe = paid(paidEd);
    const pt = paid(paidTat);
    if (!dm.length && !extraKop && !pe && !pt) continue;
    const vals = [dm.length, aptNet, directNet, carNet, extraKop, gross, ed, pe, tat, pt];
    vals.forEach((x, i) => (t[i] += x));
    rows.push([mo, String(dm.length), ...vals.slice(1).map((kop) => ({ kop }))]);
  }
  rows.push(["Итого", String(t[0]), ...t.slice(1).map((kop) => ({ kop }))]);
  return {
    title: `${REPORT_TITLES.bonus} · ${p.label}`,
    notes: [
      `Ставки — вкладка «Договорённости». Ева и Дима: квартиры ${BONUS_PCT.evaDimaApt}% от нетто (прямая бронь +${BONUS_PCT.evaDimaDirectExtra}%, всего ${BONUS_PCT.evaDimaApt + BONUS_PCT.evaDimaDirectExtra}%), машины ${BONUS_PCT.evaDimaCar}% от нетто, доп. доходы (трансфер) ${BONUS_PCT.evaDimaExtra}%. Татьяна: ${BONUS_PCT.tatyana}% от брутто.`,
      "Бронь относится к месяцу выезда. Нетто = сумма брони − комиссия площадки. Отменённые брони не считаются. Выплачивается после закрытия месяца.",
      "«Выплачено» — расходы по статьям «Комиссионные Ева и Дима» и «Комиссионные Татьяны» в этом месяце. Брони заводятся в системе с 01.11.2026 — за более ранние месяцы начисление неполное.",
      ...reviewNote(excludedReview),
    ],
    headers,
    rows,
    bold: [rows.length - 1],
    excludedReview,
  };
}

// ----------------------------------------------------------------------------- единая точка входа и вывод

export async function buildReport(
  kind: ReportKind,
  p: Period,
  opts: { assetId?: string; alloc?: boolean; includeImported?: boolean } = {},
): Promise<ReportTable> {
  switch (kind) {
    case "objects":
    case "months":
      return buildResults(kind, p, opts);
    case "owners":
      return buildOwners(p);
    case "cash":
      return buildCash(p, opts.includeImported ?? false);
    case "bonus":
      return buildBonus(p);
  }
}

export function isReportKind(v: string | undefined): v is ReportKind {
  return !!v && v in REPORT_TITLES;
}

export function cellText(c: Cell): string {
  if (typeof c === "string") return c;
  if ("kop" in c) return formatKop(c.kop);
  return c.pct === null ? "—" : `${c.pct.toFixed(0)}%`;
}

/** CSV для Excel: разделитель «;», запятая в дробях, BOM, суммы числами без пробелов. */
export function toCsv(t: ReportTable): string {
  const esc = (s: string) => (/[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const num = (c: Cell) => (typeof c === "string" ? c : "kop" in c ? (c.kop / 100).toFixed(2).replace(".", ",") : c.pct === null ? "" : c.pct.toFixed(1).replace(".", ","));
  const lines = [[t.title], ...t.notes.map((n) => [n]), [], t.headers, ...t.rows.map((r) => r.map(num))];
  return "﻿" + lines.map((l) => l.map(esc).join(";")).join("\r\n") + "\r\n";
}
