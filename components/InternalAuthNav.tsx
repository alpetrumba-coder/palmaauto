"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

/** Email и выход во внутренней зоне. */
export function InternalAuthNav() {
  const { data: session } = useSession();

  return (
    <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
      {session?.user?.email ? (
        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>{session.user.email}</span>
      ) : null}
      <Link href="/" className="nav-tap-target" style={{ fontSize: "var(--text-sm)" }}>
        Сайт
      </Link>
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
