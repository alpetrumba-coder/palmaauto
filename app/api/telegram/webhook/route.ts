import { NextRequest, NextResponse } from "next/server";

import { handleTelegramUpdate } from "@/lib/telegram-bot";
import type { TgUpdate } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/** Вебхук Telegram. Проверяем секретный заголовок, который Telegram присылает, если он задан при setWebhook. */
export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await handleTelegramUpdate(update);
  } catch (e) {
    console.error("[telegram-webhook]", e instanceof Error ? e.message : e);
  }
  // Telegram ждёт 200 в любом случае, иначе повторяет доставку.
  return NextResponse.json({ ok: true });
}
