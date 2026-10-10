import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { runRcSync } from "@/lib/rc-sync";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Сверка по расписанию (еженедельно из GitHub Actions). Защищена секретом CRON_SECRET из настроек сервера. */
export async function POST(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET не задан на сервере." }, { status: 503 });
  if (!authorized(req)) return NextResponse.json({ error: "Нет доступа." }, { status: 401 });
  const r = await runRcSync("cron", null);
  const run = await prisma.rcSyncRun.findUnique({ where: { id: r.runId }, select: { status: true, error: true, result: true } });
  const summary = (run?.result as { summary?: unknown } | null)?.summary ?? null;
  return NextResponse.json({ ok: r.ok, runId: r.runId, error: r.ok ? undefined : r.error, summary }, { status: r.ok ? 200 : 502 });
}
