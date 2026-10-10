import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

import { prisma } from "@/lib/prisma";

/**
 * Настройки приложения в базе. Секреты шифруются AES-256-GCM; ключ выводится из AUTH_SECRET сервера,
 * поэтому расшифровать можно только на самом сервере и только вместе с базой.
 * Пароль никогда не возвращается в интерфейс — только факт «задан».
 */

function key(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET не задан — нельзя шифровать настройки.");
  return scryptSync(secret, "palmaauto-app-settings", 32);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64");
}

export function decryptSecret(blob: string): string {
  const buf = Buffer.from(blob, "base64");
  const d = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
}

export async function setSetting(name: string, value: string, opts: { secret?: boolean; by?: string } = {}) {
  const stored = opts.secret ? encryptSecret(value) : value;
  await prisma.appSetting.upsert({
    where: { key: name },
    update: { value: stored, secret: !!opts.secret, updatedBy: opts.by ?? null },
    create: { key: name, value: stored, secret: !!opts.secret, updatedBy: opts.by ?? null },
  });
}

export async function getSetting(name: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: name } });
  if (!row) return null;
  try {
    return row.secret ? decryptSecret(row.value) : row.value;
  } catch {
    return null; // ключ шифрования изменился или данные повреждены — считаем, что не задано
  }
}

export async function hasSetting(name: string): Promise<boolean> {
  return (await prisma.appSetting.count({ where: { key: name } })) > 0;
}

export async function deleteSetting(name: string) {
  await prisma.appSetting.deleteMany({ where: { key: name } });
}
