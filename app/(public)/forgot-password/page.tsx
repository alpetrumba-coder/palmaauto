import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Сброс пароля",
};

export default function ForgotPasswordPage() {
  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3rem)", maxWidth: "24rem" }}>
      <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 0 }}>Сброс пароля</h1>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "1.25rem" }}>
        Укажите email — пришлём ссылку для нового пароля (если аккаунт есть в системе).
      </p>
      <ForgotPasswordForm />
      <p style={{ marginTop: "1.5rem", fontSize: "var(--text-sm)" }}>
        <Link href="/login">← Ко входу</Link>
      </p>
    </div>
  );
}
