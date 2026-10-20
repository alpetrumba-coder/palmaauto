"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { setAccountingStartDateAction } from "@/app/actions/accounting";

/** Владелец меняет дату начала учёта: с неё считаются остатки касс (начальные остатки — в «Справочники → Кассы»). */
export function AccountingStartForm({ current }: { current: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    const r = await setAccountingStartDateAction(value);
    setPending(false);
    setMsg(r.ok ? { ok: true, text: "Сохранено." } : { ok: false, text: r.error });
    if (r.ok) router.refresh();
  }

  return (
    <form onSubmit={save} style={{ display: "flex", gap: "0.5rem", alignItems: "end", flexWrap: "wrap", fontSize: "var(--text-sm)", margin: "0.6rem 0 0" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
        Дата начала учёта
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ padding: "0.4rem 0.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)", font: "inherit" }}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        style={{ padding: "0.45rem 0.9rem", borderRadius: "999px", border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text)", cursor: "pointer", font: "inherit" }}
      >
        {pending ? "…" : "Сохранить"}
      </button>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", maxWidth: "34rem" }}>
        Остаток кассы = начальный остаток на эту дату («Справочники → Кассы») + операции начиная с неё. Операции раньше этой даты в остаток не входят
        (но видны в журнале и в оплатах заездов).
      </span>
      {msg ? <span role={msg.ok ? "status" : "alert"} style={{ color: msg.ok ? "var(--color-success, #1a7f37)" : "var(--color-danger, #b00020)" }}>{msg.text}</span> : null}
    </form>
  );
}
