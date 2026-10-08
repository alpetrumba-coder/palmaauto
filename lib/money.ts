/** Деньги в учёте хранятся целыми копейками; здесь — разбор ввода и вывод в рублях. */

/**
 * Разбор суммы из поля ввода: «12500», «12 500», «3555,20», «3555.2» -> копейки.
 * Возвращает null при пустом, отрицательном или некорректном вводе.
 */
export function parseMoneyToKop(input: string): number | null {
  const s = input.replace(/\s| /g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [rub, frac = ""] = s.split(".");
  const kop = Number(rub) * 100 + Number((frac + "00").slice(0, 2));
  return Number.isSafeInteger(kop) && kop <= 2_000_000_000 ? kop : null;
}

/** 123456 -> «1 234,56 ₽»; копейки скрываются, если их нет. */
export function formatKop(kop: number): string {
  const sign = kop < 0 ? "−" : "";
  const abs = Math.abs(kop);
  const rub = Math.floor(abs / 100);
  const frac = abs % 100;
  const rubStr = new Intl.NumberFormat("ru-RU").format(rub);
  return `${sign}${rubStr}${frac ? "," + String(frac).padStart(2, "0") : ""} ₽`;
}

/** Копейки -> строка для поля ввода («3555,2» вместо «3555.20»). */
export function kopToInput(kop: number): string {
  const rub = Math.floor(Math.abs(kop) / 100);
  const frac = Math.abs(kop) % 100;
  return frac ? `${rub},${String(frac).padStart(2, "0")}` : String(rub);
}
