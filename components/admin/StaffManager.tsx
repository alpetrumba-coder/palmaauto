"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createStaffAction, generateTelegramLinkCodeAction, unlinkTelegramAction, updateStaffAction } from "@/app/actions/admin-staff";

export type StaffRow = {
  id: string;
  login: string;
  name: string;
  role: "OWNER" | "OPERATOR";
  active: boolean;
  lastLoginAt: string | null;
  telegramLinked: boolean;
  defaultCashAccountId: string | null;
};

const roleLabel: Record<StaffRow["role"], string> = { OWNER: "Владелец", OPERATOR: "Оператор" };

const fieldStyle: React.CSSProperties = {
  padding: "0.5rem 0.65rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
  font: "inherit",
  width: "100%",
};
const cell: React.CSSProperties = { padding: "0.55rem 0.75rem", borderBottom: "1px solid var(--color-border)", verticalAlign: "top" };
const btn: React.CSSProperties = {
  padding: "0.55rem 1.1rem",
  borderRadius: "999px",
  background: "var(--color-accent)",
  color: "#fff",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  fontSize: "var(--text-sm)",
};
const ghost: React.CSSProperties = {
  ...btn,
  background: "transparent",
  color: "var(--color-text)",
  border: "1px solid var(--color-border)",
  fontWeight: 400,
};
const linkBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  padding: 0,
  font: "inherit",
  fontWeight: 600,
  color: "var(--color-accent)",
  cursor: "pointer",
  textDecoration: "underline",
};

type Draft = {
  id: string | "new";
  login: string;
  name: string;
  role: "OWNER" | "OPERATOR";
  active: boolean;
  password: string;
  defaultCashAccountId: string;
};

function TelegramCell({ row }: { row: StaffRow }) {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function makeCode() {
    setPending(true);
    const r = await generateTelegramLinkCodeAction(row.id);
    setPending(false);
    if (r.ok) setCode(r.code);
  }
  async function unlink() {
    if (!window.confirm(`Отвязать Telegram у ${row.name}?`)) return;
    setPending(true);
    await unlinkTelegramAction(row.id);
    setPending(false);
    router.refresh();
  }

  if (row.telegramLinked) {
    return (
      <span style={{ display: "flex", flexDirection: "column", gap: "0.2rem", alignItems: "flex-start" }}>
        <span>привязан</span>
        <button type="button" onClick={unlink} disabled={pending} style={{ ...linkBtn, fontWeight: 400, fontSize: "var(--text-xs)" }}>
          отвязать
        </button>
      </span>
    );
  }
  if (code) {
    return (
      <span style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
        <code style={{ fontWeight: 700 }}>{code}</code>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
          В Telegram: /start {code} (код на 30 минут)
        </span>
      </span>
    );
  }
  return (
    <button type="button" onClick={makeCode} disabled={pending} style={linkBtn}>
      {pending ? "…" : "Код для привязки"}
    </button>
  );
}

export function StaffManager({ rows, myId, accounts }: { rows: StaffRow[]; myId: string; accounts: { id: string; name: string }[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function startNew() {
    setDraft({ id: "new", login: "", name: "", role: "OPERATOR", active: true, password: "", defaultCashAccountId: "" });
    setError(null);
  }
  function startEdit(r: StaffRow) {
    setDraft({
      id: r.id,
      login: r.login,
      name: r.name,
      role: r.role,
      active: r.active,
      password: "",
      defaultCashAccountId: r.defaultCashAccountId ?? "",
    });
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setError(null);
    setPending(true);
    const res =
      draft.id === "new"
        ? await createStaffAction({ login: draft.login, name: draft.name, role: draft.role, password: draft.password })
        : await updateStaffAction(draft.id, {
            name: draft.name,
            role: draft.role,
            active: draft.active,
            newPassword: draft.password,
            defaultCashAccountId: draft.defaultCashAccountId,
          });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDraft(null);
    router.refresh();
  }

  return (
    <div>
      {draft === null ? (
        <button type="button" onClick={startNew} className="nav-tap-target" style={btn}>
          Добавить сотрудника
        </button>
      ) : (
        <form
          onSubmit={onSubmit}
          style={{
            margin: "0 0 1.25rem",
            padding: "1rem",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
            gap: "0.85rem",
            background: "var(--color-surface)",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
            Логин (email) *
            <input
              type="email"
              value={draft.login}
              disabled={draft.id !== "new"}
              onChange={(e) => setDraft((d) => d && { ...d, login: e.target.value })}
              style={fieldStyle}
              autoComplete="off"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
            Имя *
            <input value={draft.name} onChange={(e) => setDraft((d) => d && { ...d, name: e.target.value })} style={fieldStyle} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
            Роль
            <select
              value={draft.role}
              onChange={(e) => setDraft((d) => d && { ...d, role: e.target.value as Draft["role"] })}
              style={fieldStyle}
            >
              <option value="OPERATOR">Оператор — вносит данные</option>
              <option value="OWNER">Владелец — всё, включая справочники и сотрудников</option>
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
            {draft.id === "new" ? "Пароль * (от 8 символов)" : "Новый пароль (оставьте пустым, чтобы не менять)"}
            <input
              type="text"
              value={draft.password}
              onChange={(e) => setDraft((d) => d && { ...d, password: e.target.value })}
              style={fieldStyle}
              autoComplete="new-password"
            />
          </label>
          {draft.id !== "new" ? (
            <>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "var(--text-sm)" }}>
                <input type="checkbox" checked={draft.active} onChange={(e) => setDraft((d) => d && { ...d, active: e.target.checked })} />
                Вход разрешён
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
                Касса по умолчанию (для Telegram-бота)
                <select
                  value={draft.defaultCashAccountId}
                  onChange={(e) => setDraft((d) => d && { ...d, defaultCashAccountId: e.target.value })}
                  style={fieldStyle}
                >
                  <option value="">не задана</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <button type="submit" disabled={pending} className="nav-tap-target" style={btn}>
              {pending ? "Сохранение…" : "Сохранить"}
            </button>
            <button type="button" onClick={() => setDraft(null)} className="nav-tap-target" style={ghost}>
              Отмена
            </button>
            {error ? (
              <span role="alert" style={{ color: "var(--color-danger, #b00020)", fontSize: "var(--text-sm)" }}>
                {error}
              </span>
            ) : null}
          </div>
        </form>
      )}

      <div style={{ overflowX: "auto", marginTop: "1rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
          <thead>
            <tr style={{ background: "var(--color-surface)", textAlign: "left" }}>
              <th style={{ ...cell, fontWeight: 600 }}>Имя</th>
              <th style={{ ...cell, fontWeight: 600 }}>Логин</th>
              <th style={{ ...cell, fontWeight: 600 }}>Роль</th>
              <th style={{ ...cell, fontWeight: 600 }}>Вход</th>
              <th style={{ ...cell, fontWeight: 600 }}>Последний вход</th>
              <th style={{ ...cell, fontWeight: 600 }}>Telegram</th>
              <th style={cell} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td style={cell} colSpan={7}>
                  Личных учёток пока нет. Вы входите общей учёткой владельца — добавьте сотрудников.
                </td>
              </tr>
            ) : null}
            {rows.map((r) => (
              <tr key={r.id} style={{ opacity: r.active ? 1 : 0.5 }}>
                <td style={cell}>
                  {r.name}
                  {r.id === myId ? " (вы)" : ""}
                </td>
                <td style={cell}>{r.login}</td>
                <td style={cell}>{roleLabel[r.role]}</td>
                <td style={cell}>{r.active ? "разрешён" : "отключён"}</td>
                <td style={cell}>{r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString("ru-RU") : "—"}</td>
                <td style={cell}>
                  <TelegramCell row={r} />
                </td>
                <td style={{ ...cell, whiteSpace: "nowrap" }}>
                  <button type="button" onClick={() => startEdit(r)} style={linkBtn}>
                    Изменить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
