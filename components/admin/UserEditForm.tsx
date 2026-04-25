"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";

import { eraseUserPersonalDataAction, updateAdminUserAction, type AdminUserProfilePayload } from "@/app/actions/admin-users";

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.65rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  fontSize: "var(--text-base)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
};

export type UserEditFormInitial = {
  email: string;
  roleLabel: string;
  lastName: string;
  firstName: string;
  patronymic: string;
  phone: string;
  address: string;
  passportData: string;
};

type UserEditFormProps = { userId: string; initial: UserEditFormInitial };

const roleLabels: Record<string, string> = {
  CUSTOMER: "Клиент",
  ADMIN: "Администратор",
};

export function UserEditForm({ userId, initial }: UserEditFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initial.email);
  const [lastName, setLastName] = useState(initial.lastName);
  const [firstName, setFirstName] = useState(initial.firstName);
  const [patronymic, setPatronymic] = useState(initial.patronymic);
  const [phone, setPhone] = useState(initial.phone);
  const [address, setAddress] = useState(initial.address);
  const [passportData, setPassportData] = useState(initial.passportData);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: AdminUserProfilePayload = {
      email,
      lastName,
      firstName,
      patronymic,
      phone,
      address,
      passportData,
    };
    setPending(true);
    const res = await updateAdminUserAction(userId, payload);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/admin-panel/users");
    router.refresh();
  }

  async function onErasePersonalData() {
    setError(null);
    if (!window.confirm("Удалить/обезличить персональные данные пользователя? Это действие необратимо.")) return;
    setPending(true);
    const res = await eraseUserPersonalDataAction(userId);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  const roleRu = roleLabels[initial.roleLabel] ?? initial.roleLabel;

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "36rem" }}>
      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
        Роль в системе: <strong style={{ color: "var(--color-text)" }}>{roleRu}</strong> (меняется не здесь). Смена email
        влияет на вход пользователя.
      </p>

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
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onErasePersonalData}
          style={{
            padding: "0.65rem 1.25rem",
            borderRadius: "999px",
            border: "1px solid var(--color-border)",
            background: "transparent",
            color: "var(--color-text)",
            fontWeight: 600,
            cursor: pending ? "wait" : "pointer",
          }}
        >
          Удалить ПДн
        </button>
        <Link href="/admin-panel/users" style={{ fontSize: "var(--text-sm)" }}>
          Отмена
        </Link>
      </div>
    </form>
  );
}
