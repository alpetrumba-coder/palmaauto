/** Выполняется один раз при старте сервера (Next.js). Здесь включается недельная сверка с RealtyCalendar. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production") {
    const { startRcScheduler } = await import("./lib/rc-scheduler");
    startRcScheduler();
  }
}
