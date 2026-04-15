/** Вторая колонка прейскуранта в PDF (как в договоре). */
export function extraServicePriceColumn(s: { pricePerDayRub: number; nonDailyPriceText: string | null }): string {
  if (s.pricePerDayRub > 0) {
    return `${s.pricePerDayRub} / сутки`;
  }
  const t = s.nonDailyPriceText?.trim();
  return t && t.length > 0 ? t : "—";
}
