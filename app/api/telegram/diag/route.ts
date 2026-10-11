import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Временная диагностика: проверяет, может ли сам сервер достучаться до api.telegram.org (с сервера, не снаружи). Удалить после отладки. */
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ ok: false, error: "TELEGRAM_BOT_TOKEN не задан" });

  const start = Date.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, { signal: ac.signal });
    const json = await res.json();
    return NextResponse.json({ ok: true, ms: Date.now() - start, status: res.status, result: json });
  } catch (e) {
    return NextResponse.json({ ok: false, ms: Date.now() - start, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
  } finally {
    clearTimeout(timer);
  }
}
