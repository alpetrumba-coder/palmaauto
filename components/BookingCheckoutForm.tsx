"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";

import { submitBookingCheckoutAction } from "@/app/actions/booking-checkout";
import type { ContractFormInput } from "@/lib/booking-contract";
import { LEGAL_DOCS } from "@/lib/legal-docs";
import { OFFICE_ADDRESS } from "@/lib/pickup-dropoff";

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
  }
}

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

function buildHourSlots(): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    const a = String(h).padStart(2, "0");
    const b = String((h + 1) % 24).padStart(2, "0");
    out.push({ id: `${a}:00`, label: `${a}:00–${b}:00` });
  }
  return out;
}

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
  days: number;
  baseTotalPriceRub: number;
  deliveryFeeRub: number;
  additionalDriverPerDayRub: number;
  childSeatPerDayRub: number;
  initialPhone: string;
  initialContract: Partial<ContractFormInput>;
};

export function BookingCheckoutForm({
  carId,
  startDate,
  endDate,
  days,
  baseTotalPriceRub,
  deliveryFeeRub,
  additionalDriverPerDayRub,
  childSeatPerDayRub,
  initialPhone,
  initialContract,
}: BookingCheckoutFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<"edit" | "review">("edit");
  const [confirmOk, setConfirmOk] = useState(false);
  const [pdpConsentOk, setPdpConsentOk] = useState(false);
  const [marketingConsentOk, setMarketingConsentOk] = useState(false);
  const [contract, setContract] = useState<ContractFormInput>(() => ({
    ...emptyContract(),
    ...initialContract,
  }));
  const [phone, setPhone] = useState(initialPhone);
  const [pickupMode, setPickupMode] = useState<"OFFICE" | "ADDRESS">("OFFICE");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupTimeSlot, setPickupTimeSlot] = useState("");
  const [dropoffMode, setDropoffMode] = useState<"OFFICE" | "ADDRESS">("OFFICE");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffTimeSlot, setDropoffTimeSlot] = useState("");
  const [secondDriverEnabled, setSecondDriverEnabled] = useState(false);
  const [secondDriverFirstName, setSecondDriverFirstName] = useState("");
  const [secondDriverLastName, setSecondDriverLastName] = useState("");
  const [secondDriverAgeYears, setSecondDriverAgeYears] = useState("");
  const [secondDriverPassportData, setSecondDriverPassportData] = useState("");
  const [childSeatEnabled, setChildSeatEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const hourSlots = buildHourSlots();

  const pickupFee = pickupMode === "ADDRESS" ? deliveryFeeRub : 0;
  const dropoffFee = dropoffMode === "ADDRESS" ? deliveryFeeRub : 0;
  const secondDriverTotal = additionalDriverPerDayRub * Math.max(1, days);
  const childSeatTotal = childSeatPerDayRub * Math.max(1, days);
  const secondDriverFeeIncluded = secondDriverEnabled ? secondDriverTotal : 0;
  const childSeatFeeIncluded = childSeatEnabled ? childSeatTotal : 0;
  const totalWithFees = baseTotalPriceRub + pickupFee + dropoffFee + secondDriverFeeIncluded + childSeatFeeIncluded;
  const extrasTotal = pickupFee + dropoffFee + secondDriverFeeIncluded + childSeatFeeIncluded;

  function setContractField<K extends keyof ContractFormInput>(key: K, value: ContractFormInput[K]) {
    setContract((prev) => ({ ...prev, [key]: value }));
  }

  function goToReview() {
    // Browser required-validation for conditional fields does not run on type="button",
    // so we perform a lightweight check and let server-side validation be the source of truth.
    setError(null);
    if (!contract.fullName.trim()) return setError("Укажите ФИО полностью.");
    if (!contract.ageYears.trim()) return setError("Укажите возраст (полных лет).");
    if (!contract.passportSeries.trim() || !contract.passportNumber.trim()) return setError("Укажите серию и номер паспорта.");
    if (!contract.passportIssuedBy.trim()) return setError("Укажите, кем и когда выдан паспорт.");
    if (!phone.trim()) return setError("Укажите телефон.");
    if (pickupMode === "ADDRESS" && pickupAddress.trim().length < 5) return setError("Укажите адрес получения (не короче 5 символов).");
    if (dropoffMode === "ADDRESS" && dropoffAddress.trim().length < 5) return setError("Укажите адрес сдачи (не короче 5 символов).");
    if (secondDriverEnabled) {
      if (!secondDriverFirstName.trim() || !secondDriverLastName.trim()) return setError("Укажите имя и фамилию второго водителя.");
      if (!secondDriverAgeYears.trim()) return setError("Укажите возраст второго водителя.");
      if (secondDriverPassportData.trim().length < 5) return setError("Укажите паспортные данные второго водителя (не короче 5 символов).");
    }
    if (!pdpConsentOk) return setError("Нужно согласие на обработку персональных данных.");
    setConfirmOk(false);
    setStep("review");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (step !== "review") {
      goToReview();
      return;
    }
    if (!confirmOk) {
      setError("Подтвердите корректность данных, чтобы перейти к оплате.");
      return;
    }
    setPending(true);
    const res = await submitBookingCheckoutAction({
      carId,
      startDate,
      endDate,
      phone,
      contract,
      pdpConsentOk,
      marketingConsentOk,
      pickupMode,
      pickupAddress,
      pickupTimeSlot,
      dropoffMode,
      dropoffAddress,
      dropoffTimeSlot,
      secondDriverEnabled,
      secondDriverFirstName,
      secondDriverLastName,
      secondDriverAgeYears,
      secondDriverPassportData,
      childSeatEnabled,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      setStep("edit");
      return;
    }
    if (typeof window !== "undefined" && typeof window.ym === "function") {
      try {
        window.ym("reachGoal", "booking_created");
      } catch {
        // ignore
      }
    }
    router.push(`/oplata/${res.bookingId}`);
    router.refresh();
  }

  const pickupLabel = pickupMode === "OFFICE" ? `офис: ${OFFICE_ADDRESS}` : `по адресу: ${pickupAddress.trim()}`;
  const dropoffLabel = dropoffMode === "OFFICE" ? `офис: ${OFFICE_ADDRESS}` : `по адресу: ${dropoffAddress.trim()}`;

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "32rem" }}
    >
      {step === "review" ? (
        <div
          style={{
            padding: "1rem",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)", fontWeight: 600 }}>Проверка данных</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
            <div>
              <strong>1‑й водитель</strong>: {contract.fullName.trim()}
            </div>
            <div>
              <strong>Паспорт</strong>: {contract.passportSeries.trim()} {contract.passportNumber.trim()}, {contract.passportIssuedBy.trim()}
            </div>
            <div>
              <strong>Телефон</strong>: {phone.trim()}
            </div>
            <div>
              <strong>Получение</strong>: {pickupLabel} {pickupFee > 0 ? `(+${pickupFee} ₽)` : "(бесплатно)"}
            </div>
            <div>
              <strong>Сдача</strong>: {dropoffLabel} {dropoffFee > 0 ? `(+${dropoffFee} ₽)` : "(бесплатно)"}
            </div>
            <div>
              <strong>Желаемое время получения</strong>: {pickupTimeSlot ? pickupTimeSlot : "не указано"}
            </div>
            <div>
              <strong>Желаемое время сдачи</strong>: {dropoffTimeSlot ? dropoffTimeSlot : "не указано"}
            </div>
            <div>
              <strong>Бустер / детское кресло</strong>: {childSeatEnabled ? `да (+${childSeatFeeIncluded} ₽)` : "нет"}
            </div>
            <div>
              <strong>2‑й водитель</strong>:{" "}
              {secondDriverEnabled
                ? `${secondDriverLastName.trim()} ${secondDriverFirstName.trim()} (+${secondDriverFeeIncluded} ₽)`
                : "нет"}
            </div>
            {secondDriverEnabled ? (
              <div>
                <strong>Паспорт 2‑го водителя</strong>: {secondDriverPassportData.trim()}
              </div>
            ) : null}
            <div>
              <strong>Итого к оплате</strong>: {totalWithFees.toLocaleString("ru-RU")} ₽
              {extrasTotal > 0 ? <span style={{ display: "block" }}>Включая доп. услуги: {extrasTotal.toLocaleString("ru-RU")} ₽</span> : null}
            </div>
            <div>
              <strong>Согласие на ПДн</strong>: {pdpConsentOk ? "да" : "нет"}
            </div>
            <div>
              <strong>Маркетинг</strong>: {marketingConsentOk ? "да" : "нет"}
            </div>
          </div>

          <p style={{ margin: "0.85rem 0 0", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
            Документы:{" "}
            <Link href={LEGAL_DOCS.policy.path} className="nav-tap-target" style={{ paddingInline: 0 }}>
              {LEGAL_DOCS.policy.title}
            </Link>
            {" · "}
            <Link href={LEGAL_DOCS.consent.path} className="nav-tap-target" style={{ paddingInline: 0 }}>
              {LEGAL_DOCS.consent.title}
            </Link>
            {" · "}
            <Link href={LEGAL_DOCS.conditions.path} className="nav-tap-target" style={{ paddingInline: 0 }}>
              {LEGAL_DOCS.conditions.title}
            </Link>
          </p>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "var(--text-sm)", cursor: "pointer", marginTop: "0.85rem" }}>
            <input type="checkbox" checked={confirmOk} onChange={(e) => setConfirmOk(e.target.checked)} />
            Подтверждаю корректность введённой информации
          </label>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.85rem" }}>
            <button
              type="button"
              className="nav-tap-target"
              onClick={() => {
                setStep("edit");
                setConfirmOk(false);
              }}
              style={{
                padding: "0.65rem 1.25rem",
                borderRadius: "999px",
                border: "1px solid var(--color-border)",
                background: "transparent",
                color: "var(--color-text)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Назад
            </button>
            <button
              type="submit"
              disabled={pending || !confirmOk}
              className="nav-tap-target"
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "999px",
                border: "none",
                background: "var(--color-accent)",
                color: "#fff",
                fontWeight: 600,
                cursor: pending ? "wait" : "pointer",
              }}
            >
              {pending ? "Отправка…" : "Перейти к оплате"}
            </button>
          </div>
        </div>
      ) : (
        <>
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

      <div
        style={{
          padding: "1rem",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)", fontWeight: 600 }}>Получение автомобиля</p>
        <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          Желаемое время — информационное поле. После оплаты время получения/сдачи согласуется с менеджером.
        </p>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)", maxWidth: "14rem" }}>
          Желаемое время получения
          <select value={pickupTimeSlot} onChange={(e) => setPickupTimeSlot(e.target.value)} style={fieldStyle}>
            <option value="">Не выбрано</option>
            {hourSlots.map((s) => (
              <option key={s.id} value={s.label}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
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
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)", maxWidth: "14rem" }}>
          Желаемое время сдачи
          <select value={dropoffTimeSlot} onChange={(e) => setDropoffTimeSlot(e.target.value)} style={fieldStyle}>
            <option value="">Не выбрано</option>
            {hourSlots.map((s) => (
              <option key={s.id} value={s.label}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
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

      <div
        style={{
          padding: "1rem",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "var(--text-sm)", cursor: "pointer" }}>
          <input type="checkbox" checked={childSeatEnabled} onChange={(e) => setChildSeatEnabled(e.target.checked)} />
          Нужен бустер / детское кресло:{" "}
          <strong>
            {childSeatPerDayRub} ₽/сут × {days} = {childSeatTotal.toLocaleString("ru-RU")} ₽
          </strong>
        </label>
      </div>

      <div
        style={{
          padding: "1rem",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "var(--text-sm)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={secondDriverEnabled}
            onChange={(e) => setSecondDriverEnabled(e.target.checked)}
          />
          Нужен второй водитель:{" "}
          <strong>
            {additionalDriverPerDayRub} ₽/сут × {days} = {secondDriverTotal.toLocaleString("ru-RU")} ₽
          </strong>
        </label>

        <div
          aria-disabled={!secondDriverEnabled}
          style={{
            marginTop: "0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            opacity: secondDriverEnabled ? 1 : 0.55,
            pointerEvents: secondDriverEnabled ? "auto" : "none",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)", flex: "1 1 10rem" }}>
              Имя
              <input
                required={secondDriverEnabled}
                value={secondDriverFirstName}
                onChange={(e) => setSecondDriverFirstName(e.target.value)}
                style={fieldStyle}
                disabled={!secondDriverEnabled}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)", flex: "1 1 10rem" }}>
              Фамилия
              <input
                required={secondDriverEnabled}
                value={secondDriverLastName}
                onChange={(e) => setSecondDriverLastName(e.target.value)}
                style={fieldStyle}
                disabled={!secondDriverEnabled}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)", maxWidth: "14rem" }}>
              Возраст (полных лет)
              <input
                required={secondDriverEnabled}
                type="number"
                min={18}
                max={100}
                value={secondDriverAgeYears}
                onChange={(e) => setSecondDriverAgeYears(e.target.value)}
                style={fieldStyle}
                disabled={!secondDriverEnabled}
              />
            </label>
          </div>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
            Паспортные данные второго водителя
            <textarea
              required={secondDriverEnabled}
              rows={3}
              placeholder="Серия, номер, кем и когда выдан"
              value={secondDriverPassportData}
              onChange={(e) => setSecondDriverPassportData(e.target.value)}
              style={{ ...wideFieldStyle, minHeight: "4rem", resize: "vertical" }}
              disabled={!secondDriverEnabled}
            />
          </label>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
        Итого к оплате:{" "}
        <strong style={{ color: "var(--color-text)" }}>
          {totalWithFees.toLocaleString("ru-RU")} ₽
        </strong>
        {extrasTotal > 0 ? (
          <span style={{ display: "block", marginTop: "0.25rem" }}>
            Включая доп. услуги: {extrasTotal.toLocaleString("ru-RU")} ₽
          </span>
        ) : null}
      </p>

      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-danger, #c00)" }}>
          {error}
        </p>
      ) : null}

      <div
        style={{
          padding: "1rem",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          display: "flex",
          flexDirection: "column",
          gap: "0.55rem",
          fontSize: "var(--text-sm)",
        }}
      >
        <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", cursor: "pointer" }}>
          <input type="checkbox" checked={pdpConsentOk} onChange={(e) => setPdpConsentOk(e.target.checked)} />
          <span>
            Я согласен(на) на обработку персональных данных в соответствии с{" "}
            <Link href={LEGAL_DOCS.policy.path} className="nav-tap-target" style={{ paddingInline: 0, fontWeight: 600 }}>
              политикой конфиденциальности
            </Link>{" "}
            и{" "}
            <Link href={LEGAL_DOCS.consent.path} className="nav-tap-target" style={{ paddingInline: 0, fontWeight: 600 }}>
              согласием на обработку ПДн
            </Link>
            .
          </span>
        </label>
        <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", cursor: "pointer" }}>
          <input type="checkbox" checked={marketingConsentOk} onChange={(e) => setMarketingConsentOk(e.target.checked)} />
          <span>
            Хочу получать информацию об акциях и скидках (Email/SMS/WhatsApp/Telegram). Можно отказаться в любой момент.
          </span>
        </label>
      </div>

      <button
        type="button"
        disabled={pending}
        className="nav-tap-target"
        onClick={goToReview}
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
        Проверить данные
      </button>
      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
        Далее откроется страница проверки: подтвердите данные и перейдите к оплате (15 минут на завершение брони).
      </p>
        </>
      )}
    </form>
  );
}
