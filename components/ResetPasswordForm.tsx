"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.75rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  fontSize: "var(--text-base)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
};

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Нет токена в ссылке. Запросите новое письмо.");
      return;
    }
    setPending(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Не удалось сменить пароль.");
      return;
    }
    router.push("/login?reset=1");
    router.refresh();
  }

  if (!token) {
    return (
      <p style={{ color: "var(--color-text-secondary)" }}>
        Ссылка неполная. <Link href="/forgot-password">Запросить сброс пароля снова</Link>.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Новый пароль
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
      </label>
      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-danger, #c00)" }}>
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="nav-tap-target"
        style={{
          padding: "0.75rem 1rem",
          borderRadius: "999px",
          border: "none",
          background: "var(--color-accent)",
          color: "#fff",
          fontWeight: 600,
          cursor: pending ? "wait" : "pointer",
        }}
      >
        {pending ? "Сохранение…" : "Сохранить пароль"}
      </button>
    </form>
  );
}
