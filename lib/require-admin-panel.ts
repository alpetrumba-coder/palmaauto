import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { adminPanelCookieName, parseAdminPanelSessionToken, type AdminPanelSession } from "@/lib/admin-panel-session";
import { prisma } from "@/lib/prisma";

/** Текущая сессия админ-панели или null. Сотрудник должен существовать и быть активным (отключение действует сразу). */
export async function getAdminPanelSession(): Promise<(AdminPanelSession & { name: string }) | null> {
  const cookieStore = await cookies();
  const session = parseAdminPanelSessionToken(cookieStore.get(adminPanelCookieName())?.value);
  if (!session) return null;
  if (session.staffId === "env") return { ...session, name: "Владелец" };

  const staff = await prisma.staffUser.findUnique({
    where: { id: session.staffId },
    select: { active: true, role: true, name: true },
  });
  if (!staff || !staff.active) return null;
  return { role: staff.role, staffId: session.staffId, name: staff.name };
}

/** Редирект на логин админ-панели, если нет валидной сессии. */
export async function requireAdminPanelSession(): Promise<AdminPanelSession & { name: string }> {
  const session = await getAdminPanelSession();
  if (!session) redirect("/admin-panel/login");
  return session;
}

/** Только владелец: управление сотрудниками и справочниками. Оператору — редирект на обзор. */
export async function requireOwner(): Promise<AdminPanelSession & { name: string }> {
  const session = await requireAdminPanelSession();
  if (session.role !== "OWNER") redirect("/admin-panel");
  return session;
}
