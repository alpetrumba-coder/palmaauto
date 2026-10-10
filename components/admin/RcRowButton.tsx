"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createDealFromRcAction, linkDealToRcAction } from "@/app/actions/rc";

type Props = { kind: "create"; rcId: number } | { kind: "link"; rcId: number; dealId: string };

/** Кнопка строки сверки: «Создать заезд» (брони нет у нас) или «Это он» (связать с существующим заездом). */
export function RcRowButton(props: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onClick() {
    setPending(true);
    setMsg(null);
    const r = props.kind === "create" ? await createDealFromRcAction(props.rcId) : await linkDealToRcAction(props.dealId, props.rcId);
    setPending(false);
    setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
    if (r.ok) router.refresh();
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: "0.2rem", alignItems: "flex-start" }}>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        style={{ border: "none", background: "transparent", padding: 0, font: "inherit", fontWeight: 600, color: "var(--color-accent)", cursor: pending ? "wait" : "pointer", textDecoration: "underline", whiteSpace: "nowrap" }}
      >
        {pending ? "…" : props.kind === "create" ? "Создать заезд" : "Это он — связать"}
      </button>
      {msg ? <span role={msg.ok ? "status" : "alert"} style={{ fontSize: "var(--text-xs)", color: msg.ok ? "var(--color-success, #1a7f37)" : "var(--color-danger, #b00020)", maxWidth: "16rem", whiteSpace: "normal" }}>{msg.text}</span> : null}
    </span>
  );
}
