"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { voidOperationAction } from "@/app/actions/accounting";

export function OperationRowActions({ id, number }: { id: string; number: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onVoid() {
    if (!window.confirm(`Аннулировать операцию №${number}? Она останется в журнале, но перестанет учитываться в остатках.`)) return;
    setPending(true);
    setError(null);
    const res = await voidOperationAction(id);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <span style={{ display: "inline-flex", gap: "0.75rem", alignItems: "center", whiteSpace: "nowrap" }}>
      <Link href={`/admin-panel/accounting/${id}/edit`} style={{ fontWeight: 600 }}>
        Изменить
      </Link>
      <button
        type="button"
        onClick={onVoid}
        disabled={pending}
        style={{ border: "none", background: "transparent", padding: 0, font: "inherit", fontWeight: 600, color: "var(--color-danger, #b00020)", cursor: pending ? "wait" : "pointer", textDecoration: "underline" }}
      >
        {pending ? "…" : "Аннулировать"}
      </button>
      {error ? <span role="alert" style={{ color: "var(--color-danger, #b00020)" }}>{error}</span> : null}
    </span>
  );
}
