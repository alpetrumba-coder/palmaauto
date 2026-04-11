import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "admin_panel_session";

/** Сессия админ-панели: подпись срока через AUTH_SECRET (7 суток). */
export function createAdminPanelSessionToken(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET не задан");
  }
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const sig = createHmac("sha256", secret).update(String(exp)).digest("hex");
  return `${exp}.${sig}`;
}

export function verifyAdminPanelSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = createHmac("sha256", secret).update(String(exp)).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export function adminPanelCookieName(): string {
  return COOKIE_NAME;
}

/** Сравнение логина/пароля без утечки по времени (длина должна совпадать для пар). */
export function safeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}
