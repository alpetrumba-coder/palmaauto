"use client";

import Link from "next/link";
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

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setPending(false);
    setDone(true);
  }

  if (done) {
    return (
      <div style={{ fontSize: "var(--text-base)", lineHeight: "var(--leading-relaxed)" }}>
        <p>Если указанный email есть в системе, мы отправили на него ссылку для сброса пароля.</p>
        <p style={{ marginTop: "1rem" }}>
          <Link href="/login">← Ко входу</Link>
        </p>
      </div>
    );
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
        {pending ? "Отправка…" : "Отправить ссылку"}
      </button>
    </form>
  );
}
