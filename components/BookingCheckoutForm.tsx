"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";

import { submitBookingCheckoutAction } from "@/app/actions/booking-checkout";

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.65rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  fontSize: "var(--text-base)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
};

type BookingCheckoutFormProps = {
  carId: string;
  startDate: string;
  endDate: string;
  initialFirstName: string;
  initialLastName: string;
  initialPassportData: string;
  initialPhone: string;
};

export function BookingCheckoutForm({
  carId,
  startDate,
  endDate,
  initialFirstName,
  initialLastName,
  initialPassportData,
  initialPhone,
}: BookingCheckoutFormProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [passportData, setPassportData] = useState(initialPassportData);
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await submitBookingCheckoutAction({
      carId,
      startDate,
      endDate,
      firstName,
      lastName,
      passportData,
      phone,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(`/oplata/${res.bookingId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "28rem" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Имя
        <input
          required
          autoComplete="given-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          style={fieldStyle}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Фамилия
        <input
          required
          autoComplete="family-name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          style={fieldStyle}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Паспортные данные
        <textarea
          required
          rows={4}
          placeholder="Серия, номер, кем и когда выдан"
          value={passportData}
          onChange={(e) => setPassportData(e.target.value)}
          style={{ ...fieldStyle, minHeight: "6rem", resize: "vertical" }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Телефон
        <input
          required
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="+7 …"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={fieldStyle}
        />
      </label>

      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-danger, #c00)" }}>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="nav-tap-target"
        style={{
          alignSelf: "flex-start",
          padding: "0.75rem 1.5rem",
          borderRadius: "999px",
          border: "none",
          background: "var(--color-accent)",
          color: "#fff",
          fontWeight: 600,
          cursor: pending ? "wait" : "pointer",
          marginTop: "0.25rem",
        }}
      >
        {pending ? "Отправка…" : "Перейти к оплате"}
      </button>
      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
        Далее откроется страница оплаты: у вас будет 15 минут, чтобы завершить бронь.
      </p>
    </form>
  );
}
