import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminPanelLoginForm } from "@/components/AdminPanelLoginForm";
import { adminPanelCookieName, verifyAdminPanelSessionToken } from "@/lib/admin-panel-session";

export const metadata: Metadata = {
  title: "Вход в админ-панель",
  robots: { index: false, follow: false },
};

export default async function AdminPanelLoginPage() {
  const cookieStore = await cookies();
  if (verifyAdminPanelSessionToken(cookieStore.get(adminPanelCookieName())?.value)) {
    redirect("/admin-panel");
  }

  return (
    <div
      className="page-shell"
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingBlock: "2rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "22rem" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 0, textAlign: "center" }}>Админ-панель</h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", textAlign: "center" }}>
          Вход по логину и паролю из переменных окружения.
        </p>
        <AdminPanelLoginForm />
        <p style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "var(--text-sm)" }}>
          <Link href="/">← На сайт</Link>
        </p>
      </div>
    </div>
  );
}
