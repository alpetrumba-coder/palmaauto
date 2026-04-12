import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { adminPanelCookieName, verifyAdminPanelSessionToken } from "@/lib/admin-panel-session";

/** Редирект на логин админ-панели, если нет валидной cookie. */
export async function requireAdminPanelSession(): Promise<void> {
  const cookieStore = await cookies();
  if (!verifyAdminPanelSessionToken(cookieStore.get(adminPanelCookieName())?.value)) {
    redirect("/admin-panel/login");
  }
}
