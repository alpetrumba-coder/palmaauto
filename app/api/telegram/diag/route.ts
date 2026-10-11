import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function probe(label: string, url: string, headers: Record<string, string>) {
  const start = Date.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8000);
  try {
    const res = await fetch(url, { headers, signal: ac.signal });
    const json = await res.json().catch(() => null);
    return { label, ok: true, ms: Date.now() - start, status: res.status, result: json };
  } catch (e) {
    return { label, ok: false, ms: Date.now() - start, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

/** Временная диагностика: проверяет связь с Telegram напрямую и через relay (с сервера, не снаружи). Удалить после отладки. */
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ ok: false, error: "TELEGRAM_BOT_TOKEN не задан" });

  const direct = await probe("direct", `https://api.telegram.org/bot${token}/getMe`, {});

  const relayUrl = process.env.TELEGRAM_RELAY_URL;
  const relaySecret = process.env.TELEGRAM_RELAY_SECRET;
  const relay = relayUrl
    ? await probe("relay", `${relayUrl.replace(/\/$/, "")}/bot${token}/getMe`, relaySecret ? { "X-Relay-Secret": relaySecret } : {})
    : { label: "relay", ok: false, error: "TELEGRAM_RELAY_URL не задан" };

  return NextResponse.json({ direct, relay });
}
