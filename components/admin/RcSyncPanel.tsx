"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { checkRcAction, runRcSyncAction } from "@/app/actions/rc";

const btn: React.CSSProperties = {
  padding: "0.6rem 1.1rem",
  borderRadius: "999px",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "var(--text-sm)",
};

/** Кнопки владельца: проверка подключения к RealtyCalendar и ручной запуск сверки. */
export function RcSyncPanel() {
  const router = useRouter();
  const [pending, setPending] = useState<"check" | "run" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function check() {
    setPending("check");
    setMsg(null);
    try {
      const r = await checkRcAction();
      setMsg({ ok: r.ok, text: `${r.ok ? "Подключение работает" : `Не получилось (${r.step})`}: ${r.detail}` });
    } catch {
      setMsg({ ok: false, text: "Не удалось выполнить проверку." });
    } finally {
      setPending(null);
    }
  }

  async function run() {
    setPending("run");
    setMsg(null);
    try {
      const r = await runRcSyncAction();
      setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Сверка не завершилась (возможно, истекло время). Обновите страницу и посмотрите журнал запусков." });
    } finally {
      setPending(null);
    }
  }

  return (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
      <button type="button" onClick={check} disabled={pending !== null} style={btn}>
        {pending === "check" ? "Проверяю…" : "Проверить подключение"}
      </button>
      <button type="button" onClick={run} disabled={pending !== null} style={{ ...btn, background: "var(--color-accent)", color: "#fff", border: "none" }}>
        {pending === "run" ? "Сверяю (до минуты)…" : "Сверить сейчас"}
      </button>
      {msg ? (
        <span role={msg.ok ? "status" : "alert"} style={{ fontSize: "var(--text-sm)", color: msg.ok ? "var(--color-success, #1a7f37)" : "var(--color-danger, #b00020)", maxWidth: "46rem" }}>
          {msg.text}
        </span>
      ) : null}
    </div>
  );
}
