/**
 * Договорённости по оплате работы и расчётам (из таблицы владельца, 28.10.2026).
 * Источник для вкладки «Договорённости» и для отчёта «Премии сотрудников» (lib/reports.ts): ставки — BONUS_PCT.
 */

export const DEFINITIONS: { term: string; meaning: string }[] = [
  { term: "Сумма брутто", meaning: "сумма с комиссией агрегатора (то, что заплатил гость)" },
  { term: "Сумма нетто", meaning: "сумма без комиссии агрегатора" },
];

export type CommissionAgreement = { who: string; area: string; pct: number; base: "нетто" | "брутто"; note?: string };

/** Ставки комиссий, %. Месяц брони — по дате выезда. */
export const BONUS_PCT = { evaDimaApt: 15, evaDimaDirectExtra: 5, evaDimaCar: 10, evaDimaExtra: 5, tatyana: 5 } as const;

export const COMMISSIONS: CommissionAgreement[] = [
  { who: "Ева + Дима", area: "недвижимость", pct: BONUS_PCT.evaDimaApt, base: "нетто" },
  { who: "Ева + Дима", area: "недвижимость", pct: BONUS_PCT.evaDimaDirectExtra, base: "нетто", note: "сверху, если прямая бронь (всего 20%)" },
  { who: "Ева + Дима", area: "автомобили", pct: BONUS_PCT.evaDimaCar, base: "нетто" },
  { who: "Ева + Дима", area: "трансфер (доп. доходы)", pct: BONUS_PCT.evaDimaExtra, base: "нетто" },
  { who: "Татьяна", area: "недвижимость", pct: BONUS_PCT.tatyana, base: "брутто" },
  { who: "Татьяна", area: "автомобили", pct: BONUS_PCT.tatyana, base: "брутто" },
];

export const OWNER_SETTLEMENTS: { owner: string; split: string; base: string; note?: string }[] = [
  { owner: "Виктор Кошман (сторонний собственник квартиры)", split: "65 / 35", base: "от цены нетто", note: "65% отдаём собственнику, 35% остаётся нам" },
];

/** Закупки для нужд Пальмы. */
export const PURCHASE_RULES: string[] = [
  "Дима закупает всё необходимое в оптовом (в Рубине) за деньги, по самым низким ценам.",
  "Оплата идёт из кассы (Ева): расход проводится как обычно, Дима только сообщает.",
  "За закупки Дима ничего не берёт — это бесплатно, отдельной комиссии нет.",
];

export const AGREEMENT_RULES: string[] = [
  "Комиссии (Ева, Дима, Татьяна) выплачиваются только после закрытия месяца: сначала все проверили месяц, внесли все данные и посчитали, затем комиссию начисляют и выдают из кассы — каждый получает свою.",
  "Комиссия по брони относится к месяцу выезда. Расчёт — отчёт «Премии сотрудников» в «Отчётах».",
];
