import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { importUnf, type UnfPayload } from "@/lib/repair-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Секрет: REPAIR_IMPORT_SECRET, если задан, иначе общий CRON_SECRET (настройки сервера). */
function authorized(req: Request): boolean {
  const secret = process.env.REPAIR_IMPORT_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Накладные УНФ по «Прораб Дима Леготкин» от задачи на сервере Powerbase. */
export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Нет доступа." }, { status: 401 });
  let body: UnfPayload;
  try {
    body = (await req.json()) as UnfPayload;
  } catch {
    return NextResponse.json({ error: "Ожидается JSON." }, { status: 400 });
  }
  if (!body || !Array.isArray(body.docs)) return NextResponse.json({ error: "Нет списка docs." }, { status: 400 });
  try {
    const r = await importUnf(body);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    console.error("[repair-unf-import]", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
