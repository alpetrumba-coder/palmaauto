import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminPanelCookieName, verifyAdminPanelSessionToken } from "@/lib/admin-panel-session";
import { processCarPhotoBuffer } from "@/lib/car-photo-process";
import { persistCarPhotoJpeg } from "@/lib/save-car-photo-upload";

export const runtime = "nodejs";

/** Загрузка фото машины: только для cookie админ-панели (path /admin-panel). */
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export async function POST(req: Request) {
  const cookieStore = await cookies();
  if (!verifyAdminPanelSessionToken(cookieStore.get(adminPanelCookieName())?.value)) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Передайте файл в поле file" }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Файл больше 20 МБ" }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  let processed: Buffer;
  try {
    processed = await processCarPhotoBuffer(buf);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Не удалось обработать изображение";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  let url: string;
  try {
    url = await persistCarPhotoJpeg(processed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Не удалось сохранить файл";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ url });
}
