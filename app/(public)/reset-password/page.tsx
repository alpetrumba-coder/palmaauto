import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Новый пароль",
};

export default function ResetPasswordPage() {
  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3rem)", maxWidth: "24rem" }}>
      <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 0 }}>Новый пароль</h1>
      <Suspense fallback={<p style={{ color: "var(--color-text-secondary)" }}>Загрузка…</p>}>
        <ResetPasswordForm />
      </Suspense>
      <p style={{ marginTop: "1.5rem", fontSize: "var(--text-sm)" }}>
        <Link href="/login">← Ко входу</Link>
      </p>
    </div>
  );
}
