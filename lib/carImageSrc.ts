/**
 * Проверка src для фото авто: локальный путь из public (/cars/...), https/http URL
 * или data URL (после загрузки на Vercel без Blob — JPEG в base64).
 */
const MAX_DATA_IMAGE_CHARS = 3 * 1024 * 1024;

export function isValidCarImageSrc(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;

  if (s.startsWith("data:image/")) {
    return isValidDataImageSrc(s);
  }

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

function isValidDataImageSrc(s: string): boolean {
  if (s.length > MAX_DATA_IMAGE_CHARS) return false;
  const comma = s.indexOf(",");
  if (comma === -1) return false;
  const header = s.slice(0, comma);
  const payload = s.slice(comma + 1);
  if (!payload.length) return false;
  if (!/^data:image\/(?:jpeg|jpg|png|webp|gif);base64$/i.test(header)) {
    return false;
  }
  return /^[A-Za-z0-9+/=\s]+$/.test(payload);
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
