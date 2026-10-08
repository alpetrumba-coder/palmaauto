/** Высокий сезон по правилам «Пальмы»: с 1 июня по 15 октября включительно. */
export function isHighSeason(d: Date): boolean {
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return (m >= 6 && m <= 9) || (m === 10 && day <= 15);
}

/** Целевая доля расходов заезда в нетто: до 30% в высокий сезон, до 35% в низкий (условие премии). */
export function targetExpenseShare(start: Date): number {
  return isHighSeason(start) ? 0.3 : 0.35;
}
