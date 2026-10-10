import { getSetting } from "@/lib/app-settings";

/**
 * Клиент RealtyCalendar для недельной сверки. Только ЧТЕНИЕ.
 *
 * У RealtyCalendar нет публичного API (в их документации: «внешнего партнёрского API нет»), поэтому служба входит под
 * служебной учётной записью и читает тот же внутренний запрос, что и страница «Клиенты и брони»:
 *   POST /v2/sign_in                      -> token
 *   GET  /v2/arrivals_departures/by_dates -> заезды/выезды по дням (заголовок X-User-Token)
 * Формат внутренний и может измениться без предупреждения; при любой неожиданности клиент останавливается и
 * возвращает понятную диагностику (без паролей и токенов).
 *
 * Логин и пароль: сначала переменные окружения RC_LOGIN / RC_PASSWORD, иначе то, что владелец ввёл на странице
 * «Сверка с RealtyCalendar» (пароль хранится зашифрованным).
 */

export type RcEvent = {
  id: number;
  begin_date: string;
  end_date: string;
  address: string;
  client_name: string | null;
  client_phone: string | null;
  source: { id: number; name: string } | null;
  rent_status: string;
  amount: number;
  prepayment: number;
  debt: number;
  notes: string | null;
};

export type RcDiagnostics = { ok: boolean; step: string; detail: string };

const BASE = () => (process.env.RC_BASE_URL || "https://realtycalendar.ru").replace(/\/$/, "");

export const RC_LOGIN_KEY = "rc.login";
export const RC_PASSWORD_KEY = "rc.password";

export async function rcCredentials(): Promise<{ login: string; password: string } | null> {
  const login = process.env.RC_LOGIN || (await getSetting(RC_LOGIN_KEY));
  const password = process.env.RC_PASSWORD || (await getSetting(RC_PASSWORD_KEY));
  return login && password ? { login, password } : null;
}

export async function rcConfigured(): Promise<boolean> {
  return (await rcCredentials()) !== null;
}

class RcError extends Error {
  constructor(public step: string, message: string) {
    super(message);
  }
}

async function http(url: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 20_000);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, redirect: "manual" });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* не JSON */
    }
    return { status: res.status, text, json };
  } catch (e) {
    throw new RcError("сеть", e instanceof Error && e.name === "AbortError" ? "Таймаут запроса к RealtyCalendar" : `Нет связи с RealtyCalendar: ${e instanceof Error ? e.message : e}`);
  } finally {
    clearTimeout(timer);
  }
}

/** Ключи ответа без значений — для диагностики, чтобы не светить данные. */
const keysOf = (j: unknown) => (j && typeof j === "object" ? Object.keys(j as object).slice(0, 8).join(", ") : typeof j);

/** Вход служебной учётной записью. Формат тела подбирается из нескольких вариантов; успешный вариант запоминается на время запроса. */
export async function rcLogin(): Promise<string> {
  const creds = await rcCredentials();
  if (!creds) throw new RcError("настройка", "Не задан доступ к RealtyCalendar: введите логин и пароль служебной учётки на странице «Сверка с RealtyCalendar».");
  const { login, password } = creds;

  const variants: Record<string, unknown>[] = [{ login, password }, { user: { login, password } }, { email: login, password }];
  const tried: string[] = [];
  for (const body of variants) {
    const res = await http(`${BASE()}/v2/sign_in`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-Locale": "ru" },
      body: JSON.stringify(body),
    });
    const token = res.json && typeof res.json === "object" ? (res.json as { token?: unknown }).token : undefined;
    if (res.status >= 200 && res.status < 300 && typeof token === "string" && token.length > 8) return token;
    tried.push(`${Object.keys(body).join("+")}: HTTP ${res.status}${res.json ? ` (${keysOf(res.json)})` : ""}`);
    if (res.status === 429) break;
  }
  throw new RcError("вход", `Вход в RealtyCalendar не удался. ${tried.join("; ")}. Проверьте логин и пароль; возможен запрос кода из SMS/письма или изменился формат входа.`);
}

async function getWindow(token: string, from: string, to: string, limit: number) {
  const url = `${BASE()}/v2/arrivals_departures/by_dates?period_start=${from}&period_end=${to}&limit=${limit}&kind=all`;
  const res = await http(url, { headers: { Accept: "application/json", "X-User-Token": token, "X-Locale": "ru" } });
  if (res.status === 401) throw new RcError("чтение", "RealtyCalendar отклонил токен (401).");
  if (res.status !== 200 || !Array.isArray(res.json)) throw new RcError("чтение", `Неожиданный ответ списка броней: HTTP ${res.status}${res.json ? ` (${keysOf(res.json)})` : ""}.`);
  return res.json as { date: string; events: RcEvent[] }[];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

/**
 * Брони за период: окно за окном (по 14 дней). Если окно вернуло слишком много событий (упёрлось в limit), оно дробится.
 * Бронь попадает в выдачу, если в окне её заезд или выезд; одну и ту же бронь дедуплицируем по id.
 */
export async function rcFetchEvents(from: Date, to: Date, token?: string): Promise<{ events: RcEvent[]; requests: number }> {
  const tok = token ?? (await rcLogin());
  const LIMIT = 300;
  const byId = new Map<number, RcEvent>();
  let requests = 0;

  const walk = async (a: Date, b: Date): Promise<void> => {
    requests++;
    if (requests > 120) throw new RcError("чтение", "Слишком много запросов за один запуск (защита от зацикливания).");
    const days = await getWindow(tok, iso(a), iso(b), LIMIT);
    const count = days.reduce((s, d) => s + d.events.length, 0);
    const span = Math.round((b.getTime() - a.getTime()) / 86400000);
    if (count >= LIMIT && span >= 1) {
      const mid = addDays(a, Math.floor(span / 2));
      await walk(a, mid);
      await walk(addDays(mid, 1), b);
      return;
    }
    for (const d of days) for (const e of d.events) byId.set(e.id, e);
    await new Promise((r) => setTimeout(r, 250)); // не торопимся: один запрос в четверть секунды
  };

  for (let a = from; a <= to; a = addDays(a, 14)) {
    const b = addDays(a, 13) > to ? to : addDays(a, 13);
    await walk(a, b);
  }
  return { events: [...byId.values()], requests };
}

/** Проверка подключения (кнопка «Проверить подключение»): вход + один запрос; без данных гостей в ответе. */
export async function rcCheck(): Promise<RcDiagnostics> {
  if (!(await rcConfigured())) return { ok: false, step: "настройка", detail: "Не задан доступ к RealtyCalendar: введите логин и пароль служебной учётки в форме выше и нажмите «Сохранить»." };
  try {
    const token = await rcLogin();
    const today = new Date();
    const { events, requests } = await rcFetchEvents(today, addDays(today, 6), token);
    return { ok: true, step: "готово", detail: `Вход выполнен, список броней читается: за ближайшие 7 дней событий ${events.length} (запросов ${requests}).` };
  } catch (e) {
    if (e instanceof RcError) return { ok: false, step: e.step, detail: e.message };
    return { ok: false, step: "ошибка", detail: e instanceof Error ? e.message : "Неизвестная ошибка" };
  }
}

export { RcError };
