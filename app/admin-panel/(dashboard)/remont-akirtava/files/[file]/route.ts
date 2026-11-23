import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { getAdminPanelSession } from "@/lib/require-admin-panel";

/**
 * Файлы ремонта Акиртава 27 (планировка, смета) — лежат в private/remont-akirtava (не в public),
 * отдаются только вошедшим в админку.
 */
const FILES: Record<string, { path: string; type: string; downloadName: string; inline: boolean }> = {
  "planirovka.pdf": {
    path: "planirovka.pdf",
    type: "application/pdf",
    downloadName: "Планировка Акиртава 27.pdf",
    inline: true,
  },
  "smeta.xlsx": {
    path: "smeta.xlsx",
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    downloadName: "Смета Акиртава 27 окончание.xlsx",
    inline: false,
  },
};

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const session = await getAdminPanelSession();
  if (!session) return new NextResponse("Нужно войти в админку: /admin-panel/login", { status: 401 });

  const { file } = await params;
  const meta = FILES[file];
  if (!meta) return new NextResponse("Файл не найден", { status: 404 });

  const body = await readFile(join(process.cwd(), "private", "remont-akirtava", meta.path));
  const disposition = `${meta.inline ? "inline" : "attachment"}; filename="${file}"; filename*=UTF-8''${encodeURIComponent(meta.downloadName)}`;
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": meta.type,
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
    },
  });
}
