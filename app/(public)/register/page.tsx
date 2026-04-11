import type { Metadata } from "next";

import { RegisterForm } from "@/components/RegisterForm";

export const metadata: Metadata = {
  title: "Регистрация",
};

export default function RegisterPage() {
  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3rem)", maxWidth: "24rem" }}>
      <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 0 }}>Регистрация</h1>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "1.25rem" }}>
        Укажите email и пароль не короче 8 символов. Роль по умолчанию — клиент.
      </p>
      <RegisterForm />
    </div>
  );
}
