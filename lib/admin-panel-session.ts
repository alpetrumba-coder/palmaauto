import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "admin_panel_session";

export type AdminRole = "OWNER" | "OPERATOR";

/** Кто вошёл в админ-панель. staffId = "env" — вход общей учёткой из .env (всегда владелец). */
export type AdminPanelSession = { role: AdminRole; staffId: string };

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function sigEqual(sig: string, expected: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

/**
 * Сессия админ-панели на 7 суток, подписана AUTH_SECRET.
 * Формат: `exp.ROLE.staffId.sig`. Старый формат `exp.sig` (общий вход до личных логинов) читается как владелец.
 */
export function createAdminPanelSessionToken(session: AdminPanelSession = { role: "OWNER", staffId: "env" }): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET не задан");
  }
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = `${exp}.${session.role}.${session.staffId}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** Проверка подписи и срока; возвращает, кто вошёл, или null. Наличие сотрудника в БД проверяет requireAdminPanelSession. */
export function parseAdminPanelSessionToken(token: string | undefined): AdminPanelSession | null {
  if (!token) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  const parts = token.split(".");

  if (parts.length === 2) {
    const [expStr, sig] = parts;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return null;
    return sigEqual(sig, sign(String(exp), secret)) ? { role: "OWNER", staffId: "env" } : null;
  }

  if (parts.length === 4) {
    const [expStr, role, staffId, sig] = parts;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return null;
    if (role !== "OWNER" && role !== "OPERATOR") return null;
    if (!sigEqual(sig, sign(`${expStr}.${role}.${staffId}`, secret))) return null;
    return { role, staffId };
  }

  return null;
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
