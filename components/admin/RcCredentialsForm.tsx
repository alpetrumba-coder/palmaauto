"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { clearRcCredentialsAction, saveRcCredentialsAction } from "@/app/actions/rc";

const field: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
  font: "inherit",
  fontSize: "16px",
  width: "100%",
};

/** Форма доступа к RealtyCalendar (владелец): логин и пароль служебной учётки. Пароль после сохранения не показывается. */
export function RcCredentialsForm({ savedLogin, passwordSaved, fromEnv }: { savedLogin: string; passwordSaved: boolean; fromEnv: boolean }) {
  const router = useRouter();
  const [login, setLogin] = useState(savedLogin);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    const r = await saveRcCredentialsAction(login, password);
    setPending(false);
    setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
    if (r.ok) {
      setPassword("");
      router.refresh();
    }
  }

  async function clear() {
    if (!window.confirm("Удалить сохранённый доступ к RealtyCalendar?")) return;
    setPending(true);
    const r = await clearRcCredentialsAction();
    setPending(false);
    setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
    router.refresh();
  }

  return (
    <form
      onSubmit={save}
      style={{ display: "flex", flexDirection: "column", gap: "0.7rem", maxWidth: "26rem", padding: "1rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", background: "var(--color-surface)" }}
    >
      <strong>Доступ к RealtyCalendar (служебная учётка)</strong>
      {fromEnv ? (
        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          Сейчас используются данные из настроек сервера (RC_LOGIN / RC_PASSWORD). Форма их не заменяет, пока они заданы.
        </span>
      ) : null}
      <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "var(--text-sm)" }}>
        Логин (почта)
        <input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="off" style={field} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "var(--text-sm)" }}>
        Пароль {passwordSaved ? "(сохранён и скрыт; введите новый, чтобы заменить)" : ""}
        <span style={{ position: "relative", display: "block" }}>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            style={{ ...field, paddingRight: "2.8rem" }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
            title={showPassword ? "Скрыть пароль" : "Показать пароль"}
            style={{ position: "absolute", right: "0.4rem", top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1, padding: "0.3rem" }}
          >
            {showPassword ? "🙈" : "👁"}
          </button>
        </span>
      </label>
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="submit"
          disabled={pending || !password}
          style={{ padding: "0.6rem 1.2rem", borderRadius: "999px", border: "none", background: "var(--color-accent)", color: "#fff", fontWeight: 700, cursor: pending ? "wait" : "pointer", opacity: password ? 1 : 0.5 }}
        >
          Сохранить
        </button>
        {passwordSaved ? (
          <button
            type="button"
            onClick={clear}
            disabled={pending}
            style={{ border: "none", background: "transparent", padding: 0, font: "inherit", color: "var(--color-danger, #b00020)", textDecoration: "underline", cursor: "pointer" }}
          >
            Удалить доступ
          </button>
        ) : null}
      </div>
      {msg ? (
        <span role={msg.ok ? "status" : "alert"} style={{ fontSize: "var(--text-sm)", color: msg.ok ? "var(--color-success, #1a7f37)" : "var(--color-danger, #b00020)" }}>
          {msg.text}
        </span>
      ) : null}
    </form>
  );
}
