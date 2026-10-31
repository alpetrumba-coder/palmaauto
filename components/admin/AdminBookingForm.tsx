"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";

import {
  createAdminBookingAction,
  type AdminBookingPaymentStatus,
} from "@/app/actions/admin-bookings";
import { formatPriceRub } from "@/lib/formatPrice";
import { inclusiveRentalDays, parseDateInput } from "@/lib/rental-dates";

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.65rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  fontSize: "var(--text-base)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
};

export type AdminBookingCarOption = {
  id: string;
  make: string;
  model: string;
  slug: string;
  active: boolean;
  pricePerDayRub: number;
  minRentalDays: number;
};

type AdminBookingFormProps = {
  cars: AdminBookingCarOption[];
  minDateStr: string;
  initialCarId?: string;
  initialFrom?: string;
  initialTo?: string;
};

export function AdminBookingForm({
  cars,
  minDateStr,
  initialCarId,
  initialFrom,
  initialTo,
}: AdminBookingFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [passportSeries, setPassportSeries] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [messenger, setMessenger] = useState("");
  const [carId, setCarId] = useState(() => {
    if (initialCarId && cars.some((c) => c.id === initialCarId)) return initialCarId;
    return cars[0]?.id ?? "";
  });
  const [start, setStart] = useState(initialFrom ?? "");
  const [end, setEnd] = useState(initialTo ?? "");
  const [totalPriceRub, setTotalPriceRub] = useState("");
  const [paidAmountRub, setPaidAmountRub] = useState("");
  const [status, setStatus] = useState<AdminBookingPaymentStatus>("PENDING_PAYMENT");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selectedCar = cars.find((c) => c.id === carId);

  const rentalDays = useMemo(() => {
    if (!start || !end) return null;
    const a = parseDateInput(start);
    const b = parseDateInput(end);
    if (!a || !b || b < a) return null;
    const days = inclusiveRentalDays(a, b);
    return days >= 1 ? days : null;
  }, [start, end]);

  const totalNum = useMemo(() => {
    const n = Number.parseInt(totalPriceRub.replace(/\s/g, ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [totalPriceRub]);

  const averagePerDay = useMemo(() => {
    if (rentalDays === null || totalNum === null) return null;
    return Math.round(totalNum / rentalDays);
  }, [rentalDays, totalNum]);

  function onStatusChange(next: AdminBookingPaymentStatus) {
    setStatus(next);
    if (next === "PENDING_PAYMENT") {
      setPaidAmountRub("0");
    } else if (next === "PAID" && totalNum !== null) {
      setPaidAmountRub(String(totalNum));
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!carId) {
      setError("Выберите автомобиль.");
      return;
    }
    if (rentalDays === null) {
      setError("Укажите корректный период аренды.");
      return;
    }
    const total = Number.parseInt(totalPriceRub.replace(/\s/g, ""), 10);
    const paid = Number.parseInt(paidAmountRub.replace(/\s/g, ""), 10);
    if (!Number.isFinite(total) || total <= 0) {
      setError("Укажите общую сумму заказа.");
      return;
    }
    if (!Number.isFinite(paid) || paid < 0) {
      setError("Укажите сумму предоплаты.");
      return;
    }

    setPending(true);
    const res = await createAdminBookingAction({
      guest: {
        fullName,
        birthYear,
        passportSeries,
        passportNumber,
        phone,
        messenger,
      },
      carId,
      startDate: start,
      endDate: end,
      totalPriceRub: total,
      paidAmountRub: paid,
      status,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/admin-panel/bookings");
    router.refresh();
  }

  if (cars.length === 0) {
    return (
      <p style={{ color: "var(--color-text-secondary)" }}>
        Нет автомобилей. Добавьте машину в разделе «Автомобили в прокате».
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "32rem" }}>
      <fieldset
        style={{
          margin: 0,
          padding: "1rem",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
        }}
      >
        <legend style={{ fontWeight: 600, fontSize: "var(--text-sm)", padding: "0 0.25rem" }}>
          Турист
        </legend>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
          ФИО
          <input
            name="fullName"
            required
            autoComplete="name"
            placeholder="Фамилия Имя Отчество"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={fieldStyle}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
          Год рождения
          <input
            name="birthYear"
            required
            inputMode="numeric"
            placeholder="1990"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            style={fieldStyle}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
            Серия паспорта
            <input
              name="passportSeries"
              value={passportSeries}
              onChange={(e) => setPassportSeries(e.target.value)}
              style={fieldStyle}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
            Номер паспорта
            <input
              name="passportNumber"
              value={passportNumber}
              onChange={(e) => setPassportNumber(e.target.value)}
              style={fieldStyle}
            />
          </label>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
          Телефон туриста
          <input
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={fieldStyle}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
          Мессенджер
          <input
            name="messenger"
            placeholder="WhatsApp / Telegram / MAX…"
            value={messenger}
            onChange={(e) => setMessenger(e.target.value)}
            style={fieldStyle}
          />
        </label>
      </fieldset>

      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Автомобиль
        <select name="carId" required value={carId} onChange={(e) => setCarId(e.target.value)} style={fieldStyle}>
          {cars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.make} {c.model}
              {!c.active ? " (скрыт в каталоге)" : ""} — {formatPriceRub(c.pricePerDayRub)}/сут. в каталоге
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Дата начала
        <input
          type="date"
          name="start"
          required
          min={minDateStr}
          value={start}
          onChange={(e) => setStart(e.target.value)}
          style={fieldStyle}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Дата окончания
        <input
          type="date"
          name="end"
          required
          min={start || minDateStr}
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          style={fieldStyle}
        />
      </label>

      {rentalDays !== null ? (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          Срок аренды: <strong style={{ color: "var(--color-text)" }}>{rentalDays} сут.</strong>
          {selectedCar ? (
            <>
              {" "}
              · тариф в каталоге: {formatPriceRub(selectedCar.pricePerDayRub)}/сут. (только справка)
            </>
          ) : null}
        </p>
      ) : null}

      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Общая сумма заказа, ₽
        <input
          type="number"
          min={1}
          step={1}
          required
          value={totalPriceRub}
          onChange={(e) => {
            setTotalPriceRub(e.target.value);
            if (status === "PAID") {
              const n = Number.parseInt(e.target.value.replace(/\s/g, ""), 10);
              if (Number.isFinite(n) && n > 0) setPaidAmountRub(String(n));
            }
          }}
          style={fieldStyle}
        />
      </label>

      {averagePerDay !== null && rentalDays !== null ? (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          Средняя стоимость в сутки:{" "}
          <strong style={{ color: "var(--color-text)" }}>{formatPriceRub(averagePerDay)}</strong>
          {" "}
          ({formatPriceRub(totalNum!)} ÷ {rentalDays} сут.)
        </p>
      ) : totalPriceRub && rentalDays === null ? (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          Укажите даты, чтобы посчитать среднюю стоимость в сутки.
        </p>
      ) : null}

      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Предоплата, ₽
        <input
          type="number"
          min={0}
          step={1}
          required
          value={paidAmountRub}
          onChange={(e) => setPaidAmountRub(e.target.value)}
          disabled={status === "PENDING_PAYMENT"}
          style={{
            ...fieldStyle,
            opacity: status === "PENDING_PAYMENT" ? 0.7 : 1,
          }}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Статус оплаты
        <select
          name="status"
          value={status}
          onChange={(e) => onStatusChange(e.target.value as AdminBookingPaymentStatus)}
          style={fieldStyle}
        >
          <option value="PENDING_PAYMENT">Ожидает оплаты</option>
          <option value="PARTIALLY_PAID">Внесена предоплата</option>
          <option value="PAID">Полная оплата</option>
        </select>
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
          {pending ? "Создание…" : "Создать бронь"}
        </button>
        <Link href="/admin-panel/bookings" style={{ fontSize: "var(--text-sm)" }}>
          Отмена
        </Link>
      </div>
    </form>
  );
}
