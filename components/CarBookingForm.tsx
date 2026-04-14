"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";

import { createBookingAction } from "@/app/actions/bookings";
import type { ContractFormInput } from "@/lib/booking-contract";
import { formatPriceRub } from "@/lib/formatPrice";
import { inclusiveRentalDays, parseDateInput } from "@/lib/rental-dates";

type CarBookingFormProps = {
  carId: string;
  slug: string;
  pricePerDayRub: number;
  minDateStr: string;
  /** Подстановка из URL подбора по датам (`/cars/slug?from=&to=`). */
  initialStartDate?: string;
  initialEndDate?: string;
  /** Все поля ТС для договора заполнены в админке. */
  carLeaseComplete: boolean;
  /** Минимальный срок аренды для авто (в сутках). */
  minRentalDays: number;
  /** Предзаполнение из профиля (ФИО, паспорт). */
  contractDefaults?: Partial<ContractFormInput>;
};

const inputStyle: CSSProperties = {
  width: "100%",
  maxWidth: "22rem",
  padding: "0.5rem 0.65rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  fontSize: "var(--text-base)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
};

const wideInputStyle: CSSProperties = {
  ...inputStyle,
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

export function CarBookingForm({
  carId,
  slug,
  pricePerDayRub,
  minDateStr,
  initialStartDate,
  initialEndDate,
  carLeaseComplete,
  minRentalDays,
  contractDefaults,
}: CarBookingFormProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [start, setStart] = useState(initialStartDate ?? "");
  const [end, setEnd] = useState(initialEndDate ?? "");
  const [contract, setContract] = useState<ContractFormInput>(() => ({
    ...emptyContract(),
    ...contractDefaults,
  }));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const preview = useMemo(() => {
    if (!start || !end) return null;
    const a = parseDateInput(start);
    const b = parseDateInput(end);
    if (!a || !b || b < a) return null;
    const days = inclusiveRentalDays(a, b);
    if (days < 1) return null;
    return { days, total: days * pricePerDayRub };
  }, [start, end, pricePerDayRub]);

  const minDaysOk = preview ? preview.days >= Math.max(1, minRentalDays) : true;

  function setContractField<K extends keyof ContractFormInput>(key: K, value: ContractFormInput[K]) {
    setContract((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!session?.user) return;
    if (!carLeaseComplete) {
      setError("По этому автомобилю не заполнены данные для договора. Выберите другой автомобиль или свяжитесь с нами.");
      return;
    }
    if (preview && !minDaysOk) {
      setError(`Минимальный срок аренды для этого автомобиля — ${Math.max(1, minRentalDays)} сут.`);
      return;
    }
    setPending(true);
    const res = await createBookingAction({
      carId,
      startDate: start,
      endDate: end,
      contract,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (!res.bookingId) {
      setError("Не удалось получить номер брони.");
      return;
    }
    router.push(`/oplata/${res.bookingId}`);
    router.refresh();
  }

  if (status === "loading") {
    return <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>Проверка сессии…</p>;
  }

  if (!session?.user) {
    return (
      <div
        style={{
          marginTop: "calc(var(--space-unit) * 3)",
          padding: "1.25rem",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <p style={{ margin: "0 0 0.75rem", fontSize: "var(--text-base)", fontWeight: 600 }}>Бронирование</p>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          <Link href={`/login?callbackUrl=/cars/${encodeURIComponent(slug)}`}>Войдите</Link>
          {" или "}
          <Link href="/register">зарегистрируйтесь</Link>, чтобы выбрать даты.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: "calc(var(--space-unit) * 3)",
        padding: "1.25rem",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        maxWidth: "32rem",
      }}
    >
      <p style={{ margin: "0 0 1rem", fontSize: "var(--text-base)", fontWeight: 600 }}>Бронирование</p>
      {!carLeaseComplete ? (
        <p
          role="status"
          style={{
            margin: "0 0 1rem",
            padding: "0.75rem",
            borderRadius: "var(--radius-md)",
            background: "color-mix(in srgb, var(--color-danger, #c00) 12%, transparent)",
            fontSize: "var(--text-sm)",
          }}
        >
          По этому автомобилю в каталоге не хватает данных для договора (год выпуска, цвет, гос. номер, СТС). Бронирование
          с PDF временно недоступно — выберите другой автомобиль или свяжитесь с офисом.
        </p>
      ) : null}
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
          Дата начала
          <input
            type="date"
            required
            min={minDateStr}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
          Дата окончания
          <input
            type="date"
            required
            min={start || minDateStr}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            style={inputStyle}
          />
        </label>
        {preview ? (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
            {preview.days} сут. × {formatPriceRub(pricePerDayRub)} ={" "}
            <strong style={{ color: "var(--color-text)" }}>{formatPriceRub(preview.total)}</strong>
            <span style={{ display: "block", marginTop: "0.25rem" }}>Далее — оплата в течение 15 минут.</span>
          </p>
        ) : null}
        {preview && !minDaysOk ? (
          <p role="alert" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-danger, #c00)" }}>
            Минимальный срок аренды для этого автомобиля — {Math.max(1, minRentalDays)} сут.
          </p>
        ) : null}

        <div
          style={{
            marginTop: "0.5rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600 }}>Данные для договора аренды</p>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
            После бронирования вы сможете скачать заполненный PDF. Укажите данные как в паспорте.
          </p>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
            ФИО полностью
            <input
              required
              value={contract.fullName}
              onChange={(e) => setContractField("fullName", e.target.value)}
              style={wideInputStyle}
              autoComplete="name"
            />
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)", flex: "1 1 8rem" }}>
              Год рождения
              <input
                type="number"
                required
                min={1940}
                max={new Date().getFullYear() - 18}
                value={contract.birthYear}
                onChange={(e) => setContractField("birthYear", e.target.value)}
                style={inputStyle}
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
                style={inputStyle}
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
                style={inputStyle}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)", flex: "1 1 8rem" }}>
              Номер паспорта
              <input
                required
                value={contract.passportNumber}
                onChange={(e) => setContractField("passportNumber", e.target.value)}
                style={inputStyle}
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
              style={{ ...wideInputStyle, resize: "vertical", minHeight: "4rem" }}
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
              style={wideInputStyle}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
            Паспорт доп. водителя (серия и номер)
            <input
              value={contract.additionalDriverPassport}
              onChange={(e) => setContractField("additionalDriverPassport", e.target.value)}
              style={wideInputStyle}
            />
          </label>
        </div>

        {error ? (
          <p role="alert" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-danger, #c00)" }}>
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending || !carLeaseComplete || (preview ? !minDaysOk : false)}
          className="nav-tap-target"
          style={{
            alignSelf: "flex-start",
            padding: "0.65rem 1.25rem",
            borderRadius: "999px",
            border: "none",
            background: "var(--color-accent)",
            color: "#fff",
            fontWeight: 600,
            cursor: pending || !carLeaseComplete ? "not-allowed" : "pointer",
            opacity: !carLeaseComplete ? 0.6 : 1,
          }}
        >
          {pending ? "Создание…" : "Забронировать и оплатить"}
        </button>
      </form>
    </div>
  );
}
