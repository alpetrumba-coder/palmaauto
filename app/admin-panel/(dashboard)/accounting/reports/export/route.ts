import { NextResponse } from "next/server";

import { buildReport, isReportKind, parsePeriod, toCsv } from "@/lib/reports";
import { getAdminPanelSession } from "@/lib/require-admin-panel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Выгрузка отчёта в CSV (открывается в Excel). Те же параметры, что у страницы отчётов; нужен вход в админку. */
export async function GET(req: Request) {
  if (!(await getAdminPanelSession())) return NextResponse.json({ error: "Нужен вход в админ-панель." }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const rk = sp.get("r") ?? "objects";
  if (!isReportKind(rk)) return NextResponse.json({ error: "Неизвестный отчёт." }, { status: 400 });

  const period = parsePeriod({ from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined, preset: sp.get("preset") ?? undefined });
  const table = await buildReport(rk, period, { assetId: sp.get("asset") || undefined, alloc: sp.get("alloc") === "1", includeImported: sp.get("hist") === "1" });

  const name = `otchet-${rk}-${period.fromStr}_${period.toStr}.csv`;
  return new NextResponse(toCsv(table), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
  });
}
