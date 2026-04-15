"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";

import { submitBookingCheckoutAction } from "@/app/actions/booking-checkout";
import type { ContractFormInput } from "@/lib/booking-contract";
import { OFFICE_ADDRESS } from "@/lib/pickup-dropoff";

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
  baseTotalPriceRub: number;
  deliveryFeeRub: number;
  initialPhone: string;
  initialContract: Partial<ContractFormInput>;
};

export function BookingCheckoutForm({
  carId,
  startDate,
  endDate,
  baseTotalPriceRub,
  deliveryFeeRub,
  initialPhone,
  initialContract,
}: BookingCheckoutFormProps) {
  const router = useRouter();
  const [contract, setContract] = useState<ContractFormInput>(() => ({
    ...emptyContract(),
    ...initialContract,
  }));
  const [phone, setPhone] = useState(initialPhone);
  const [pickupMode, setPickupMode] = useState<"OFFICE" | "ADDRESS">("OFFICE");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffMode, setDropoffMode] = useState<"OFFICE" | "ADDRESS">("OFFICE");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const pickupFee = pickupMode === "ADDRESS" ? deliveryFeeRub : 0;
  const dropoffFee = dropoffMode === "ADDRESS" ? deliveryFeeRub : 0;
  const totalWithFees = baseTotalPriceRub + pickupFee + dropoffFee;

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
      pickupMode,
      pickupAddress,
      dropoffMode,
      dropoffAddress,
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

      <div
        style={{
          padding: "1rem",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)", fontWeight: 600 }}>Получение автомобиля</p>
        <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", fontSize: "var(--text-sm)", cursor: "pointer" }}>
          <input
            type="radio"
            name="pickup"
            value="OFFICE"
            checked={pickupMode === "OFFICE"}
            onChange={() => setPickupMode("OFFICE")}
          />
          <span>
            Бесплатно: <strong>{OFFICE_ADDRESS}</strong>
          </span>
        </label>
        <label
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "flex-start",
            fontSize: "var(--text-sm)",
            cursor: "pointer",
            marginTop: "0.35rem",
          }}
        >
          <input
            type="radio"
            name="pickup"
            value="ADDRESS"
            checked={pickupMode === "ADDRESS"}
            onChange={() => setPickupMode("ADDRESS")}
          />
          <span>
            Доставка по адресу (Абхазия): <strong>{deliveryFeeRub} ₽</strong>
          </span>
        </label>
        {pickupMode === "ADDRESS" ? (
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)", marginTop: "0.65rem" }}>
            Адрес получения
            <textarea
              required
              rows={2}
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="Например: Гагра, ул. …, дом …"
              style={{ ...wideFieldStyle, minHeight: "3.5rem", resize: "vertical" }}
            />
          </label>
        ) : null}
      </div>

      <div
        style={{
          padding: "1rem",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)", fontWeight: 600 }}>Сдача автомобиля</p>
        <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", fontSize: "var(--text-sm)", cursor: "pointer" }}>
          <input
            type="radio"
            name="dropoff"
            value="OFFICE"
            checked={dropoffMode === "OFFICE"}
            onChange={() => setDropoffMode("OFFICE")}
          />
          <span>
            Бесплатно: <strong>{OFFICE_ADDRESS}</strong>
          </span>
        </label>
        <label
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "flex-start",
            fontSize: "var(--text-sm)",
            cursor: "pointer",
            marginTop: "0.35rem",
          }}
        >
          <input
            type="radio"
            name="dropoff"
            value="ADDRESS"
            checked={dropoffMode === "ADDRESS"}
            onChange={() => setDropoffMode("ADDRESS")}
          />
          <span>
            Приёмка по адресу (Абхазия): <strong>{deliveryFeeRub} ₽</strong>
          </span>
        </label>
        {dropoffMode === "ADDRESS" ? (
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)", marginTop: "0.65rem" }}>
            Адрес сдачи
            <textarea
              required
              rows={2}
              value={dropoffAddress}
              onChange={(e) => setDropoffAddress(e.target.value)}
              placeholder="Например: Сухум, ул. …, дом …"
              style={{ ...wideFieldStyle, minHeight: "3.5rem", resize: "vertical" }}
            />
          </label>
        ) : null}
      </div>

      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
        Итого к оплате:{" "}
        <strong style={{ color: "var(--color-text)" }}>
          {totalWithFees.toLocaleString("ru-RU")} ₽
        </strong>
        {pickupFee + dropoffFee > 0 ? (
          <span style={{ display: "block", marginTop: "0.25rem" }}>
            Включая доп. услуги: {pickupFee + dropoffFee} ₽
          </span>
        ) : null}
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

      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)", maxWidth: "14rem" }}>
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
