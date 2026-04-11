"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminPanelLogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    await fetch("/api/admin-panel/logout", { method: "POST" });
    setPending(false);
    router.push("/admin-panel/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="nav-tap-target"
      style={{
        fontSize: "var(--text-sm)",
        padding: "0.45rem 0.9rem",
        borderRadius: "999px",
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        cursor: pending ? "wait" : "pointer",
        color: "var(--color-text)",
      }}
    >
      {pending ? "…" : "Выйти"}
    </button>
  );
}
