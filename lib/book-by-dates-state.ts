import { getAvailableCarsForRentalRange } from "@/lib/availability";
import { formatDateInputUTC, inclusiveRentalDays, parseDateInput, utcToday } from "@/lib/rental-dates";

export type BookByDatesState = {
  fromStr: string;
  toStr: string;
  searched: boolean;
  error: string | null;
  cars: Awaited<ReturnType<typeof getAvailableCarsForRentalRange>>;
};

/** Разбор query `from`/`to` и загрузка свободных машин (как на `/book`). */
export async function getBookByDatesState(fromStr: string, toStr: string): Promise<BookByDatesState> {
  const trimmedFrom = fromStr.trim();
  const trimmedTo = toStr.trim();
  let error: string | null = null;
  let cars: Awaited<ReturnType<typeof getAvailableCarsForRentalRange>> = [];
  const searched = Boolean(trimmedFrom && trimmedTo);

  if (!searched) {
    return { fromStr: trimmedFrom, toStr: trimmedTo, searched: false, error: null, cars: [] };
  }

  const start = parseDateInput(trimmedFrom);
  const end = parseDateInput(trimmedTo);
  if (!start || !end) {
    error = "Укажите корректные даты.";
  } else if (end < start) {
    error = "Дата окончания не может быть раньше даты начала.";
  } else if (start < utcToday()) {
    error = "Нельзя искать период в прошлом.";
  } else {
    const days = inclusiveRentalDays(start, end);
    if (days > 90) {
      error = "Максимальный срок в подборе — 90 суток.";
    } else if (days < 1) {
      error = "Некорректный период.";
    } else {
      cars = await getAvailableCarsForRentalRange(start, end);
    }
  }

  return { fromStr: trimmedFrom, toStr: trimmedTo, searched, error, cars };
}

export function bookByDatesMinDateStr(): string {
  return formatDateInputUTC(utcToday());
}
