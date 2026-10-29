import { syncCarDeals } from "@/lib/car-deals";
import { rcConfigured } from "@/lib/rc-client";
import { runRcSync } from "@/lib/rc-sync";
import { prisma } from "@/lib/prisma";

/**
 * Расписание сверки внутри сервера: каждый день после 05:00 UTC (08:00 по Москве). Повторяется не раньше чем
 * через 20 часов после предыдущего запуска (успешного или нет) — так не задвоится при перезапуске сервера, но
 * пройдёт при ближайшей проверке, если сервер был выключен в момент обычного времени запуска. Проверка каждые 30 минут.
 */

const HOUR = 3600_000;

/** Пора ли запускать: чистая функция (удобно проверять). */
export function isDue(now: Date, lastCron: { startedAt: Date; status: string } | null): boolean {
  if (now.getUTCHours() < 5) return false; // не раньше 08:00 МСК
  if (!lastCron) return true;
  const age = now.getTime() - lastCron.startedAt.getTime();
  return age > 20 * HOUR;
}

let started = false;
let busy = false;
let lastCarSweep: Date | null = null;

async function tick() {
  if (busy) return;
  busy = true;
  try {
    // брони машин → карточки аренды: подстраховка для изменений, которые прошли мимо (автоотмена неоплаченных и т.п.)
    await syncCarDeals(lastCarSweep ?? undefined).catch((e) => console.error("[car-deals] sweep", e instanceof Error ? e.message : e));
    lastCarSweep = new Date(Date.now() - 5 * 60_000);
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
  console.log("[rc-scheduler] запущен: сверка с RealtyCalendar каждый день около 08:00 МСК");
}
