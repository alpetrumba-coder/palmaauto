"use server";

import { revalidatePath } from "next/cache";

import { hashPassword, validatePasswordPlain } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/require-admin-panel";

export type StaffActionResult = { ok: true } | { ok: false; error: string };

const LOGIN_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createStaffAction(input: {
  login: string;
  name: string;
  role: "OWNER" | "OPERATOR";
  password: string;
}): Promise<StaffActionResult> {
  await requireOwner();

  const login = input.login.trim().toLowerCase();
  const name = input.name.trim();
  if (!LOGIN_RE.test(login)) return { ok: false, error: "Логин — адрес электронной почты." };
  if (!name) return { ok: false, error: "Укажите имя." };
  if (input.role !== "OWNER" && input.role !== "OPERATOR") return { ok: false, error: "Недопустимая роль." };
  const pwErr = validatePasswordPlain(input.password);
  if (pwErr) return { ok: false, error: pwErr };

  try {
    await prisma.staffUser.create({
      data: { login, name, role: input.role, passwordHash: await hashPassword(input.password) },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { ok: false, error: "Сотрудник с таким логином уже есть." };
    throw e;
  }
  revalidatePath("/admin-panel/staff");
  return { ok: true };
}

export async function updateStaffAction(
  id: string,
  input: { name: string; role: "OWNER" | "OPERATOR"; active: boolean; newPassword: string; defaultCashAccountId: string },
): Promise<StaffActionResult> {
  const me = await requireOwner();

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Укажите имя." };
  if (input.role !== "OWNER" && input.role !== "OPERATOR") return { ok: false, error: "Недопустимая роль." };
  if (id === me.staffId && (!input.active || input.role !== "OWNER")) {
    return { ok: false, error: "Нельзя отключить себя или снять с себя роль владельца." };
  }

  const data: {
    name: string;
    role: "OWNER" | "OPERATOR";
    active: boolean;
    passwordHash?: string;
    defaultCashAccountId: string | null;
  } = {
    name,
    role: input.role,
    active: input.active,
    defaultCashAccountId: input.defaultCashAccountId || null,
  };
  if (input.newPassword) {
    const pwErr = validatePasswordPlain(input.newPassword);
    if (pwErr) return { ok: false, error: pwErr };
    data.passwordHash = await hashPassword(input.newPassword);
  }

  try {
    await prisma.staffUser.update({ where: { id }, data });
  } catch (e) {
    if ((e as { code?: string }).code === "P2025") return { ok: false, error: "Сотрудник не найден." };
    throw e;
  }
  revalidatePath("/admin-panel/staff");
  return { ok: true };
}

export type TelegramLinkResult = { ok: true; code: string; botUsername: string | null } | { ok: false; error: string };

/** Одноразовый код на 30 минут: сотрудник пишет боту «/start <код>», чат привязывается к его учётке. */
export async function generateTelegramLinkCodeAction(staffId: string): Promise<TelegramLinkResult> {
  await requireOwner();
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  try {
    await prisma.staffUser.update({
      where: { id: staffId },
      data: { telegramLinkCode: code, telegramLinkExpires: new Date(Date.now() + 30 * 60_000) },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2025") return { ok: false, error: "Сотрудник не найден." };
    throw e;
  }
  revalidatePath("/admin-panel/staff");
  return { ok: true, code, botUsername: process.env.TELEGRAM_BOT_USERNAME || null };
}

export async function unlinkTelegramAction(staffId: string): Promise<StaffActionResult> {
  await requireOwner();
  await prisma.staffUser.update({
    where: { id: staffId },
    data: { telegramChatId: null, telegramLinkCode: null, telegramLinkExpires: null },
  });
  revalidatePath("/admin-panel/staff");
  return { ok: true };
}
