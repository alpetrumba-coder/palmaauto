"use server";

import { revalidatePath } from "next/cache";

import { deleteSetting, setSetting } from "@/lib/app-settings";
import { RC_LOGIN_KEY, RC_PASSWORD_KEY, rcCheck, type RcDiagnostics } from "@/lib/rc-client";
import { createDealFromRc, linkDealToRc } from "@/lib/rc-actions-core";
import { runRcSync } from "@/lib/rc-sync";
import { requireAdminPanelSession, requireOwner } from "@/lib/require-admin-panel";

export type RcActionResult = { ok: true; message: string } | { ok: false; error: string };

function revalidate() {
  revalidatePath("/admin-panel/accounting/rc");
  revalidatePath("/admin-panel/accounting/deals");
}

/** Проверка подключения: вход служебной учёткой и один запрос списка. Только владелец. */
export async function checkRcAction(): Promise<RcDiagnostics> {
  await requireOwner();
  return rcCheck();
}

/** Сверка по кнопке (то же, что делает расписание). Только владелец. */
export async function runRcSyncAction(): Promise<RcActionResult> {
  const me = await requireOwner();
  const r = await runRcSync("manual", me.name);
  revalidate();
  return r.ok ? { ok: true, message: "Сверка выполнена." } : { ok: false, error: r.error ?? "Сверка не удалась." };
}

/** Создаёт заезд из брони RealtyCalendar, которой нет у нас (данные берутся из последней сверки), и связывает их. */
export async function createDealFromRcAction(rcId: number): Promise<RcActionResult> {
  const me = await requireAdminPanelSession();
  const res = await createDealFromRc(rcId, me.name);
  if (!res.ok) return res;
  revalidate();
  return res;
}

/** Связывает существующий заезд с бронью RealtyCalendar (для строк «расходятся»: оператор подтверждает, что это одна и та же бронь). */
export async function linkDealToRcAction(dealId: string, rcId: number): Promise<RcActionResult> {
  await requireAdminPanelSession();
  const res = await linkDealToRc(dealId, rcId);
  if (!res.ok) return res;
  revalidate();
  return { ok: true, message: "Связано. Расхождения останутся в сверке, пока вы не исправите заезд." };
}

/** Сохраняет доступ служебной учётки RealtyCalendar. Пароль шифруется и больше никогда не показывается. Только владелец. */
export async function saveRcCredentialsAction(login: string, password: string): Promise<RcActionResult> {
  const me = await requireOwner();
  const l = login.trim();
  if (!l || l.length > 200) return { ok: false, error: "Укажите логин (почту) служебной учётки." };
  if (password.length < 6 || password.length > 200) return { ok: false, error: "Пароль — от 6 до 200 символов." };
  await setSetting(RC_LOGIN_KEY, l, { by: me.name });
  await setSetting(RC_PASSWORD_KEY, password, { secret: true, by: me.name });
  revalidate();
  return { ok: true, message: "Сохранено. Пароль хранится в зашифрованном виде и больше не показывается. Нажмите «Проверить подключение»." };
}

export async function clearRcCredentialsAction(): Promise<RcActionResult> {
  await requireOwner();
  await deleteSetting(RC_LOGIN_KEY);
  await deleteSetting(RC_PASSWORD_KEY);
  revalidate();
  return { ok: true, message: "Доступ к RealtyCalendar удалён." };
}
