"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

/** Ссылки Вход / Регистрация или email и Выход в публичной шапке. */
export function PublicAuthNav() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }} aria-hidden>
        …
      </span>
    );
  }

  if (session?.user) {
    return (
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }} title={session.user.email}>
          {session.user.email}
        </span>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="nav-tap-target"
          style={{
            fontSize: "var(--text-sm)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text)",
            padding: 0,
          }}
        >
          Выйти
        </button>
      </div>
    );
  }

  return (
    <>
      <Link href="/login" className="nav-tap-target" style={{ fontSize: "var(--text-sm)" }}>
        Вход
      </Link>
      <Link href="/register" className="nav-tap-target" style={{ fontSize: "var(--text-sm)" }}>
        Регистрация
      </Link>
    </>
  );
}
