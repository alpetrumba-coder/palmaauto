"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Не удалось зарегистрироваться.");
      return;
    }
    router.push("/login?registered=1");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Email
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Пароль (не короче 8 символов)
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
          opacity: pending ? 0.85 : 1,
        }}
      >
        {pending ? "Регистрация…" : "Зарегистрироваться"}
      </button>
      <p style={{ margin: 0, fontSize: "var(--text-sm)" }}>
        Уже есть аккаунт? <Link href="/login">Войти</Link>
      </p>
    </form>
  );
}
