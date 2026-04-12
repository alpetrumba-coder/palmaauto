/**
 * Проверка src для фото авто: локальный путь из public (/cars/...) или https/http URL.
 */
export function isValidCarImageSrc(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;

  if (s.startsWith("/")) {
    return isSafeCarsPublicPath(s);
  }

  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Только пути вида /cars/... — файлы лежат в public/cars/ */
function isSafeCarsPublicPath(p: string): boolean {
  if (!p.startsWith("/cars/")) return false;
  if (p.startsWith("//")) return false;
  if (p.includes("..")) return false;
  if (p.includes("//")) return false;
  if (p.length > 500) return false;
  const rest = p.slice(1);
  return /^[a-zA-Z0-9._\-/]+$/.test(rest);
}
