import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAdminPanelSession } from "@/lib/require-admin-panel";

/** Фото накладной/чека ремонта — только вошедшим в админку. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminPanelSession();
  if (!session) return new NextResponse("Нужно войти в админку: /admin-panel/login", { status: 401 });
  const { id } = await params;
  const f = await prisma.repairFile.findUnique({ where: { id } });
  if (!f) return new NextResponse("Файл не найден", { status: 404 });
  return new NextResponse(new Uint8Array(f.data), {
    headers: {
      "Content-Type": f.mime,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
