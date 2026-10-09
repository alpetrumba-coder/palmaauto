import { NextResponse } from "next/server";

import { importOperations, previewImport, type ImportOperation } from "@/lib/accounting-import";
import { getAdminPanelSession } from "@/lib/require-admin-panel";

export const runtime = "nodejs";

const TYPES = ["INCOME", "EXPENSE", "TRANSFER", "HANDOVER"];
const MAX_ROWS = 20000;

function isOperation(o: unknown): o is ImportOperation {
  if (!o || typeof o !== "object") return false;
  const x = o as Record<string, unknown>;
  return (
    typeof x.sourceRef === "string" && /^uk:\d+$/.test(x.sourceRef) &&
    typeof x.date === "string" &&
    typeof x.type === "string" && TYPES.includes(x.type) &&
    typeof x.amountKop === "number" &&
    typeof x.accountName === "string" &&
    (x.categoryName === null || typeof x.categoryName === "string") &&
    (x.assetName === null || typeof x.assetName === "string") &&
    typeof x.comment === "string" && x.comment.length <= 1000 &&
    typeof x.needsReview === "boolean" &&
    (x.reviewNote === null || typeof x.reviewNote === "string")
  );
}

/**
 * Импорт истории (только владелец). ?dryRun=1 — предпросмотр без записи.
 * Лежит под /admin-panel: cookie входа в админку действует только на этом пути (поэтому не в /api).
 * Тело: JSON-массив строк из scripts/import-uk/normalize.py. Повторная загрузка безопасна (sourceRef уникален).
 */
export async function POST(req: Request) {
  const session = await getAdminPanelSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Загрузка истории доступна только владельцу." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать файл: это не JSON." }, { status: 400 });
  }
  if (!Array.isArray(body) || body.length === 0 || body.length > MAX_ROWS) {
    return NextResponse.json({ error: `Ожидается непустой список операций (не более ${MAX_ROWS}).` }, { status: 400 });
  }
  const bad = body.findIndex((o) => !isOperation(o));
  if (bad >= 0) {
    return NextResponse.json({ error: `Строка ${bad + 1} файла имеет неверный формат. Нужен файл, подготовленный normalize.py.` }, { status: 400 });
  }
  const ops = body as ImportOperation[];

  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";
  try {
    if (dryRun) return NextResponse.json({ ok: true, preview: await previewImport(ops) });
    return NextResponse.json({ ok: true, result: await importOperations(ops, `Импорт (${session.name})`) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Ошибка импорта." }, { status: 422 });
  }
}
