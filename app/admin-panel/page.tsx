import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminPanelLogoutButton } from "@/components/AdminPanelLogoutButton";
import { adminPanelCookieName, verifyAdminPanelSessionToken } from "@/lib/admin-panel-session";

export const metadata: Metadata = {
  title: "Админ-панель",
  robots: { index: false, follow: false },
};

export default async function AdminPanelPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminPanelCookieName())?.value;

  if (!verifyAdminPanelSessionToken(token)) {
    redirect("/admin-panel/login");
  }

  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 6vw, 3rem)", maxWidth: "40rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "var(--text-3xl)", margin: 0 }}>Админ-панель</h1>
        <AdminPanelLogoutButton />
      </div>
      <p style={{ color: "var(--color-text-secondary)", marginTop: "0.75rem" }}>
        Заглушка: здесь позже появятся управление автопарком, бронями и пользователями.
      </p>
      <div
        className="catalog-placeholder"
        role="status"
        style={{ marginTop: "calc(var(--space-unit) * 2)", textAlign: "left" }}
      >
        Раздел в разработке.
      </div>
      <p style={{ marginTop: "calc(var(--space-unit) * 3)", fontSize: "var(--text-sm)" }}>
        <Link href="/">← На сайт</Link>
      </p>
    </div>
  );
}
