import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPanelLoginForm } from "@/components/AdminPanelLoginForm";
import { PalmaAutoLogo } from "@/components/PalmaAutoLogo";
import { getAdminPanelSession } from "@/lib/require-admin-panel";

export const metadata: Metadata = {
  title: "Вход в админ-панель",
  robots: { index: false, follow: false },
};

export default async function AdminPanelLoginPage() {
  // Проверяем и сотрудника в БД: отключённый с ещё живой cookie должен видеть форму входа, а не уходить в цикл редиректов.
  if (await getAdminPanelSession()) {
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
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
          <Link href="/" className="nav-tap-target" style={{ textDecoration: "none", color: "var(--color-text)" }}>
            <PalmaAutoLogo size="var(--text-2xl)" />
          </Link>
        </div>
        <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 0, textAlign: "center" }}>Админ-панель</h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", textAlign: "center" }}>
          Войдите под своей учётной записью сотрудника.
        </p>
        <AdminPanelLoginForm />
        <p style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "var(--text-sm)" }}>
          <Link href="/">← На сайт</Link>
        </p>
      </div>
    </div>
  );
}
