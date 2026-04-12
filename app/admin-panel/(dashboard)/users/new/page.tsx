import type { Metadata } from "next";
import Link from "next/link";

import { UserCreateForm } from "@/components/admin/UserCreateForm";

export const metadata: Metadata = {
  title: "Новый пользователь — админ",
  robots: { index: false, follow: false },
};

export default function AdminNewUserPage() {
  return (
    <>
      <p style={{ marginBottom: "1rem", fontSize: "var(--text-sm)" }}>
        <Link href="/admin-panel/users">← Пользователи</Link>
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 0 }}>Новый пользователь</h1>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginBottom: "1.25rem", maxWidth: "36rem" }}>
        Задайте email и пароль для входа на сайт. Остальные поля можно заполнить сразу или позже в карточке пользователя.
      </p>
      <UserCreateForm />
    </>
  );
}
