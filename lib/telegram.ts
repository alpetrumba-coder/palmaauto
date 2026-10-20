/**
 * Тонкая обёртка над Telegram Bot API (без внешних зависимостей).
 *
 * С хостинга сервера (ru-3) api.telegram.org напрямую недоступен (исходящие соединения зависают).
 * Поэтому запросы, если задан TELEGRAM_RELAY_URL, идут через маленький прокси на отдельном сервере
 * (telegram-relay/server.js, сервер в Нидерландах), который пересылает их в api.telegram.org.
 * Прокси проверяет заголовок X-Relay-Secret.
 */

function token(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

function apiBase(): string {
  const relay = process.env.TELEGRAM_RELAY_URL;
  return relay ? relay.replace(/\/$/, "") : "https://api.telegram.org";
}

async function call<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const t = token();
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8000);
  let res: Response;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const relaySecret = process.env.TELEGRAM_RELAY_SECRET;
    if (relaySecret) headers["X-Relay-Secret"] = relaySecret;
    res = await fetch(`${apiBase()}/bot${t}/${method}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: ac.signal,
    });
  } catch (e) {
    throw new Error(`Telegram ${method}: сеть недоступна (${e instanceof Error ? e.message : String(e)})`);
  } finally {
    clearTimeout(timer);
  }
  const json = (await res.json().catch(() => null)) as { ok: boolean; result?: T; description?: string } | null;
  if (!res.ok || !json?.ok) throw new Error(`Telegram ${method}: HTTP ${res.status}${json?.description ? ` — ${json.description}` : ""}`);
  return json.result as T;
}

export type InlineButton = { text: string; callback_data: string };

export function sendMessage(chatId: number | bigint, text: string, buttons?: InlineButton[][]) {
  return call("sendMessage", {
    chat_id: chatId.toString(),
    text,
    reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
  });
}

export function editMessageText(chatId: number | bigint, messageId: number, text: string) {
  return call("editMessageText", { chat_id: chatId.toString(), message_id: messageId, text });
}

export function answerCallbackQuery(id: string, text?: string) {
  return call("answerCallbackQuery", { callback_query_id: id, text });
}

export function setWebhook(url: string, secretToken: string) {
  return call("setWebhook", { url, secret_token: secretToken, allowed_updates: ["message", "callback_query"] });
}

export function telegramConfigured(): boolean {
  return !!token();
}

/** Путь к файлу в Telegram (нужен, чтобы скачать голосовое). */
export async function getFile(fileId: string): Promise<{ file_path: string; file_size?: number }> {
  const r = await call<{ file_id: string; file_unique_id: string; file_size?: number; file_path?: string }>("getFile", {
    file_id: fileId,
  });
  if (!r.file_path) throw new Error("Telegram getFile: нет file_path");
  return { file_path: r.file_path, file_size: r.file_size };
}

/** Скачать файл бота (голос — Ogg Opus). Идёт через тот же relay, что и остальные вызовы API. */
export async function downloadFile(filePath: string): Promise<Buffer> {
  const t = token();
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 20_000);
  try {
    const headers: Record<string, string> = {};
    const relaySecret = process.env.TELEGRAM_RELAY_SECRET;
    if (relaySecret) headers["X-Relay-Secret"] = relaySecret;
    const res = await fetch(`${apiBase()}/file/bot${t}/${filePath}`, { headers, signal: ac.signal });
    if (!res.ok) throw new Error(`Telegram downloadFile: HTTP ${res.status}`);
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch (e) {
    throw new Error(`Telegram downloadFile: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    clearTimeout(timer);
  }
}

// --- типы входящих апдейтов (только то, что используем) ---
export type TgVoice = { file_id: string; duration?: number; mime_type?: string; file_size?: number };

export type TgUpdate = {
  message?: { message_id: number; chat: { id: number }; text?: string; voice?: TgVoice };
  callback_query?: { id: string; data?: string; message?: { message_id: number; chat: { id: number } } };
};
