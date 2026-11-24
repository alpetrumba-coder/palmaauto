/**
 * График оплат долгосрочной брони (от 28 ночей): срок делится на месяцы от дня заезда
 * (06.09–06.10, 06.10–06.11, …), платёж за месяц ждём в его первый день.
 *  - Сумма месяца: фиксированный «платёж в месяц» из брони (monthlyKop), последний месяц — остаток;
 *    если не задан — полные месяцы поровну, неполный последний — по ночам (ночей / 30 от полного).
 *  - Хвост короче 7 ночей присоединяется к предыдущему месяцу (не делаем платёж за 1–6 ночей).
 *  - Полученное засчитывается в месяцы по порядку с первого; депозит («депозит», «аванс за последний месяц»
 *    в комментарии операции) — с конца, в последний месяц.
 */

export const LONG_STAY_NIGHTS = 28;
const TAIL_MERGE_NIGHTS = 7;
const DAY = 86400000;

export type Installment = {
  /** Порядковый номер месяца, с 1. */
  index: number;
  /** Начало периода = день, когда ждём платёж, YYYY-MM-DD. */
  from: string;
  /** Конец периода (день выезда/начала следующего), YYYY-MM-DD. */
  to: string;
  nights: number;
  amountKop: number;
  paidKop: number;
  leftKop: number;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const nightsBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY);

export function isLongStay(startDate: Date, endDate: Date): boolean {
  return nightsBetween(startDate, endDate) >= LONG_STAY_NIGHTS;
}

/** То же число месяца через k месяцев от заезда (31-е в коротком месяце → последний день месяца). */
function anchor(start: Date, k: number): Date {
  const y = start.getUTCFullYear();
  const m = start.getUTCMonth() + k;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(start.getUTCDate(), lastDay)));
}

/** Депозит / аванс за последний месяц — засчитывается с конца графика. */
export function isDepositComment(text: string | null | undefined): boolean {
  return !!text && /депозит|аванс\s+за\s+последн/i.test(text);
}

export function buildSchedule(opts: {
  startDate: Date;
  endDate: Date;
  /** Сколько всего должны получить (сумма брони − комиссия). */
  netKop: number;
  monthlyKop?: number | null;
  /** Засчитать с первого месяца (обычные оплаты, ожидаемая предоплата площадки). */
  paidFrontKop: number;
  /** Засчитать с последнего месяца (депозит). */
  paidBackKop: number;
}): Installment[] {
  const { startDate, endDate, netKop } = opts;
  if (!isLongStay(startDate, endDate) || netKop <= 0) return [];

  // периоды по месяцам от дня заезда
  type P = { from: Date; to: Date; weight: number };
  const periods: P[] = [];
  for (let k = 0; ; k++) {
    const from = anchor(startDate, k);
    if (from >= endDate) break;
    const next = anchor(startDate, k + 1);
    const to = next < endDate ? next : endDate;
    const full = to.getTime() === next.getTime();
    periods.push({ from, to, weight: full ? 1 : nightsBetween(from, to) / 30 });
  }
  const last = periods[periods.length - 1];
  if (periods.length > 1 && nightsBetween(last.from, last.to) < TAIL_MERGE_NIGHTS) {
    periods.pop();
    const prev = periods[periods.length - 1];
    prev.weight += nightsBetween(prev.to, last.to) / 30;
    prev.to = last.to;
  }

  if (periods.length < 2) return []; // один месяц (с хвостом) — обычная бронь, без графика

  // суммы
  const amounts: number[] = [];
  const monthly = opts.monthlyKop && opts.monthlyKop > 0 ? opts.monthlyKop : null;
  const totalW = periods.reduce((s, p) => s + p.weight, 0);
  let acc = 0;
  periods.forEach((p, i) => {
    let a: number;
    if (i === periods.length - 1) a = netKop - acc;
    else if (monthly) a = Math.round(monthly * Math.min(1, p.weight));
    else a = Math.round((netKop * p.weight) / totalW);
    a = Math.max(0, Math.min(a, netKop - acc));
    amounts.push(a);
    acc += a;
  });

  // зачёт полученного: депозит с конца, остальное с начала
  const paid = amounts.map(() => 0);
  let back = Math.max(0, opts.paidBackKop);
  for (let i = amounts.length - 1; i >= 0 && back > 0; i--) {
    const x = Math.min(back, amounts[i]);
    paid[i] += x;
    back -= x;
  }
  let front = Math.max(0, opts.paidFrontKop) + back; // лишний депозит — тоже с начала
  for (let i = 0; i < amounts.length && front > 0; i++) {
    const x = Math.min(front, amounts[i] - paid[i]);
    paid[i] += x;
    front -= x;
  }

  return periods.map((p, i) => ({
    index: i + 1,
    from: iso(p.from),
    to: iso(p.to),
    nights: nightsBetween(p.from, p.to),
    amountKop: amounts[i],
    paidKop: paid[i],
    leftKop: amounts[i] - paid[i],
  }));
}

/** «06.12–06.01» */
export function periodLabel(i: Pick<Installment, "from" | "to">): string {
  const f = (s: string) => `${s.slice(8, 10)}.${s.slice(5, 7)}`;
  return `${f(i.from)}–${f(i.to)}`;
}
