import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Вход",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; reset?: string }>;
}) {
  const q = await searchParams;

  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3rem)", maxWidth: "24rem" }}>
      <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 0 }}>Вход</h1>
      {q.registered === "1" ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
          Регистрация прошла успешно. Войдите с тем же email и паролем.
        </p>
      ) : null}
      {q.reset === "1" ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
          Пароль обновлён. Можно войти.
        </p>
      ) : null}
      <Suspense fallback={<p style={{ color: "var(--color-text-secondary)" }}>Загрузка формы…</p>}>
        <LoginForm />
      </Suspense>
      <p style={{ marginTop: "1.5rem", fontSize: "var(--text-sm)" }}>
        Нет аккаунта? <Link href="/register">Регистрация</Link>
      </p>
      <p style={{ marginTop: "0.75rem", fontSize: "var(--text-sm)" }}>
        <Link href="/forgot-password">Забыли пароль?</Link>
      </p>
    </div>
  );
}
