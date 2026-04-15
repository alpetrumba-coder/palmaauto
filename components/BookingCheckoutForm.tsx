"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";

import { submitBookingCheckoutAction } from "@/app/actions/booking-checkout";
import type { ContractFormInput } from "@/lib/booking-contract";

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.65rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  fontSize: "var(--text-base)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
};

const wideFieldStyle: CSSProperties = {
  ...fieldStyle,
  maxWidth: "100%",
};

function emptyContract(): ContractFormInput {
  return {
    fullName: "",
    birthYear: "",
    ageYears: "",
    passportSeries: "",
    passportNumber: "",
    passportIssuedBy: "",
    additionalDriverName: "",
    additionalDriverPassport: "",
  };
}

type BookingCheckoutFormProps = {
  carId: string;
  startDate: string;
  endDate: string;
  initialPhone: string;
  initialContract: Partial<ContractFormInput>;
};

export function BookingCheckoutForm({
  carId,
  startDate,
  endDate,
  initialPhone,
  initialContract,
}: BookingCheckoutFormProps) {
  const router = useRouter();
  const [contract, setContract] = useState<ContractFormInput>(() => ({
    ...emptyContract(),
    ...initialContract,
  }));
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const maxBirthYear = new Date().getUTCFullYear() - 18;

  function setContractField<K extends keyof ContractFormInput>(key: K, value: ContractFormInput[K]) {
    setContract((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await submitBookingCheckoutAction({
      carId,
      startDate,
      endDate,
      phone,
      contract,
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
    <form
      onSubmit={onSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "32rem" }}
    >
      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
        Данные для договора аренды и PDF: укажите как в паспорте.
      </p>

      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        ФИО полностью
        <input
          required
          autoComplete="name"
          value={contract.fullName}
          onChange={(e) => setContractField("fullName", e.target.value)}
          style={wideFieldStyle}
        />
      </label>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)", flex: "1 1 8rem" }}>
          Год рождения
          <input
            type="number"
            required
            min={1940}
            max={maxBirthYear}
            value={contract.birthYear}
            onChange={(e) => setContractField("birthYear", e.target.value)}
            style={fieldStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)", flex: "1 1 8rem" }}>
          Возраст (полных лет)
          <input
            type="number"
            required
            min={18}
            max={100}
            value={contract.ageYears}
            onChange={(e) => setContractField("ageYears", e.target.value)}
            style={fieldStyle}
          />
        </label>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)", flex: "1 1 8rem" }}>
          Серия паспорта
          <input
            required
            value={contract.passportSeries}
            onChange={(e) => setContractField("passportSeries", e.target.value)}
            style={fieldStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)", flex: "1 1 8rem" }}>
          Номер паспорта
          <input
            required
            value={contract.passportNumber}
            onChange={(e) => setContractField("passportNumber", e.target.value)}
            style={fieldStyle}
          />
        </label>
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Кем и когда выдан паспорт
        <textarea
          required
          rows={3}
          value={contract.passportIssuedBy}
          onChange={(e) => setContractField("passportIssuedBy", e.target.value)}
          style={{ ...wideFieldStyle, minHeight: "4rem", resize: "vertical" }}
        />
      </label>

      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
        Дополнительный водитель (п. 1.3 договора), необязательно:
      </p>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        ФИО доп. водителя
        <input
          value={contract.additionalDriverName}
          onChange={(e) => setContractField("additionalDriverName", e.target.value)}
          style={wideFieldStyle}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Паспорт доп. водителя (серия и номер)
        <input
          value={contract.additionalDriverPassport}
          onChange={(e) => setContractField("additionalDriverPassport", e.target.value)}
          style={wideFieldStyle}
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
