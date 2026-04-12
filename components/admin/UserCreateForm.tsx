"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";

import { createAdminUserAction, type AdminCreateUserPayload } from "@/app/actions/admin-users";

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.65rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  fontSize: "var(--text-base)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
};

export function UserCreateForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [role, setRole] = useState<"CUSTOMER" | "ADMIN">("CUSTOMER");
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [patronymic, setPatronymic] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [passportData, setPassportData] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: AdminCreateUserPayload = {
      email,
      password,
      passwordConfirm,
      role,
      lastName,
      firstName,
      patronymic,
      phone,
      address,
      passportData,
    };
    setPending(true);
    const res = await createAdminUserAction(payload);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/admin-panel/users");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "36rem" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Роль
        <select
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as "CUSTOMER" | "ADMIN")}
          style={fieldStyle}
        >
          <option value="CUSTOMER">Клиент</option>
          <option value="ADMIN">Администратор</option>
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={fieldStyle}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Пароль
        <input
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={fieldStyle}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Пароль ещё раз
        <input
          name="passwordConfirm"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          style={fieldStyle}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Фамилия
        <input name="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} style={fieldStyle} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Имя
        <input name="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={fieldStyle} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Отчество
        <input name="patronymic" value={patronymic} onChange={(e) => setPatronymic(e.target.value)} style={fieldStyle} />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Телефон
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={fieldStyle}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Адрес
        <textarea
          name="address"
          rows={3}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={{ ...fieldStyle, resize: "vertical", minHeight: "4rem" }}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Паспорт (серия, номер, кем и когда выдан)
        <textarea
          name="passportData"
          rows={4}
          value={passportData}
          onChange={(e) => setPassportData(e.target.value)}
          style={{ ...fieldStyle, resize: "vertical", minHeight: "5rem" }}
        />
      </label>

      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-danger, #c00)" }}>
          {error}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "0.65rem 1.25rem",
            borderRadius: "999px",
            border: "none",
            background: "var(--color-accent)",
            color: "#fff",
            fontWeight: 600,
            cursor: pending ? "wait" : "pointer",
          }}
        >
          {pending ? "Создание…" : "Создать"}
        </button>
        <Link href="/admin-panel/users" style={{ fontSize: "var(--text-sm)" }}>
          Отмена
        </Link>
      </div>
    </form>
  );
}
