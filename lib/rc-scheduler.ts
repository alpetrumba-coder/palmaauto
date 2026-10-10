import { rcConfigured } from "@/lib/rc-client";
import { runRcSync } from "@/lib/rc-sync";
import { prisma } from "@/lib/prisma";

/**
 * Расписание сверки внутри сервера: по понедельникам после 05:00 UTC (08:00 по Москве). Успешная сверка — раз в неделю,
 * неудачная повторяется не раньше чем через сутки. Проверка каждые 30 минут; если сервер в понедельник перезапускали,
 * сверка пройдёт при ближайшей проверке.
 */

const HOUR = 3600_000;

/** Пора ли запускать: чистая функция (удобно проверять). */
export function isDue(now: Date, lastCron: { startedAt: Date; status: string } | null): boolean {
  if (now.getUTCDay() !== 1 || now.getUTCHours() < 5) return false; // понедельник, после 08:00 МСК
  if (!lastCron) return true;
  const age = now.getTime() - lastCron.startedAt.getTime();
  if (lastCron.status === "ok") return age > 6 * 24 * HOUR;
  return age > 20 * HOUR;
}

let started = false;
let busy = false;

async function tick() {
  if (busy) return;
  busy = true;
  try {
    if (!(await rcConfigured())) return;
    const last = await prisma.rcSyncRun.findFirst({ where: { trigger: "cron" }, orderBy: { startedAt: "desc" }, select: { startedAt: true, status: true } });
    if (isDue(new Date(), last)) await runRcSync("cron", null);
  } catch (e) {
    console.error("[rc-scheduler]", e instanceof Error ? e.message : e);
  } finally {
    busy = false;
  }
}

export function startRcScheduler() {
  if (started) return;
  started = true;
  setTimeout(tick, 60_000).unref?.();
  setInterval(tick, 30 * 60_000).unref?.();
  console.log("[rc-scheduler] запущен: сверка с RealtyCalendar по понедельникам около 08:00 МСК");
}
