/**
 * Распознавание коротких голосовых (Telegram Ogg Opus → текст).
 * Провайдер: Yandex SpeechKit (синхронный STT), доступен с серверов в РФ.
 *
 * Env:
 *   YANDEX_SPEECHKIT_API_KEY — ключ сервисного аккаунта (Api-Key …)
 *   YANDEX_FOLDER_ID — каталог облака (нужен, если ключ не от сервисного аккаунта)
 */

const STT_URL = "https://stt.api.cloud.yandex.net/speech/v1/stt:recognize";

/** Лимит синхронного SpeechKit: 30 сек / ~1 МБ. Голосовые учёта обычно короче. */
export const VOICE_MAX_SECONDS = 30;

export function speechConfigured(): boolean {
  return !!process.env.YANDEX_SPEECHKIT_API_KEY?.trim();
}

export type SpeechResult = { ok: true; text: string } | { ok: false; error: string };

/** Распознать Ogg Opus (как присылает Telegram voice). Язык — русский. */
export async function recognizeOggOpus(audio: Buffer): Promise<SpeechResult> {
  const apiKey = process.env.YANDEX_SPEECHKIT_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "Голос ещё не настроен: нет ключа YANDEX_SPEECHKIT_API_KEY." };
  }
  if (audio.length === 0) return { ok: false, error: "Пустой аудиофайл." };
  if (audio.length > 1_000_000) return { ok: false, error: "Голосовое слишком большое (лимит 1 МБ). Скажите короче." };

  // Для Api-Key сервисного аккаунта folderId НЕ передаём (так пишет Яндекс).
  // Если передать — часто получаем PermissionDenied на каталог, даже при правильной роли.
  // folderId нужен только для IAM-токена пользователя: YANDEX_SPEECHKIT_PASS_FOLDER_ID=1
  const folderId = process.env.YANDEX_FOLDER_ID?.trim();
  const passFolder = process.env.YANDEX_SPEECHKIT_PASS_FOLDER_ID === "1";
  const qs = new URLSearchParams({ lang: "ru-RU", topic: "general", format: "oggopus" });
  if (passFolder && folderId) qs.set("folderId", folderId);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 25_000);
  let res: Response;
  try {
    res = await fetch(`${STT_URL}?${qs}`, {
      method: "POST",
      headers: {
        Authorization: `Api-Key ${apiKey}`,
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(audio),
      signal: ac.signal,
    });
  } catch (e) {
    return { ok: false, error: `Сеть SpeechKit: ${e instanceof Error ? e.message : String(e)}` };
  } finally {
    clearTimeout(timer);
  }

  const json = (await res.json().catch(() => null)) as { result?: string; error_code?: string; error_message?: string } | null;
  if (!res.ok) {
    const detail = json?.error_message || json?.error_code || `HTTP ${res.status}`;
    return { ok: false, error: `SpeechKit: ${detail}` };
  }
  const text = (json?.result ?? "").trim();
  if (!text) return { ok: false, error: "Не разобрал речь. Повторите чётче или напишите текстом." };
  return { ok: true, text };
}
