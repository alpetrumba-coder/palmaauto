"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { cancelDealAction } from "@/app/actions/deals";

export function DealCancelButton({ id, number }: { id: string; number: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!window.confirm(`Отменить заезд/аренду №${number}? Даты освободятся, внесённые оплаты и расходы останутся в журнале.`)) return;
    setPending(true);
    setError(null);
    const res = await cancelDealAction(id);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <span style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        style={{ border: "none", background: "transparent", padding: 0, font: "inherit", fontWeight: 600, color: "var(--color-danger, #b00020)", cursor: pending ? "wait" : "pointer", textDecoration: "underline" }}
      >
        {pending ? "…" : "Отменить"}
      </button>
      {error ? <span role="alert" style={{ color: "var(--color-danger, #b00020)" }}>{error}</span> : null}
    </span>
  );
}
