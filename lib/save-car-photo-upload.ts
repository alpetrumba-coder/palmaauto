import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { put } from "@vercel/blob";

const MAX_DATA_URL_BYTES = 900_000;

/**
 * Сохраняет JPEG после обработки: Vercel Blob (если есть токен), иначе локально в public,
 * на Vercel без Blob — data URL (ограниченный размер).
 */
export async function persistCarPhotoJpeg(buffer: Buffer): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`car-photos/${randomUUID()}.jpg`, buffer, {
      access: "public",
      addRandomSuffix: true,
      contentType: "image/jpeg",
    });
    return blob.url;
  }

  if (process.env.VERCEL) {
    if (buffer.length > MAX_DATA_URL_BYTES) {
      throw new Error(
        "На Vercel без хранилища файл слишком большой. Добавьте BLOB_READ_WRITE_TOKEN (Vercel Blob) в переменные окружения.",
      );
    }
    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  }

  const dir = join(process.cwd(), "public", "cars", "uploads");
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.jpg`;
  await writeFile(join(dir, name), buffer);
  return `/cars/uploads/${name}`;
}
