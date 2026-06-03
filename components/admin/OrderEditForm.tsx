"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";

import {
  cancelAdminOrderAction,
  updateAdminOrderAction,
  type AdminBookingPaymentStatus,
} from "@/app/actions/admin-orders";
import type { AdminUserProfilePayload } from "@/app/actions/admin-users";
import { bookingStatusToPaymentStatus } from "@/lib/admin-booking-payment";
import { formatPriceRub } from "@/lib/formatPrice";
import { inclusiveRentalDays, parseDateInput } from "@/lib/rental-dates";
import type { BookingStatus } from "@prisma/client";

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.65rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  fontSize: "var(--text-base)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
};

export type CarOption = { id: string; label: string; pricePerDayRub: number };

export type OrderEditFormInitial = {
  bookingId: string;
  userId: string;
  roleLabel: string;
  status: BookingStatus;
  paymentStatus: AdminBookingPaymentStatus;
  totalPriceRub: number;
  carId: string;
  startDate: string;
  endDate: string;
  paidAmountRub: number;
  adminComment: string;
  email: string;
  lastName: string;
  firstName: string;
  patronymic: string;
  phone: string;
  address: string;
  passportData: string;
};

type OrderEditFormProps = {
  initial: OrderEditFormInitial;
  cars: CarOption[];
  cancelHref: string;
};

const roleLabels: Record<string, string> = {
  CUSTOMER: "Клиент",
  ADMIN: "Администратор",
};

export function OrderEditForm({ initial, cars, cancelHref }: OrderEditFormProps) {
  const router = useRouter();
  const [carId, setCarId] = useState(initial.carId);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [totalPriceRub, setTotalPriceRub] = useState(String(initial.totalPriceRub));
  const [paidAmountRub, setPaidAmountRub] = useState(String(initial.paidAmountRub));
  const [paymentStatus, setPaymentStatus] = useState<AdminBookingPaymentStatus>(
    initial.paymentStatus ?? bookingStatusToPaymentStatus(initial.status),
  );
  const [adminComment, setAdminComment] = useState(initial.adminComment);
  const [email, setEmail] = useState(initial.email);
  const [lastName, setLastName] = useState(initial.lastName);
  const [firstName, setFirstName] = useState(initial.firstName);
  const [patronymic, setPatronymic] = useState(initial.patronymic);
  const [phone, setPhone] = useState(initial.phone);
  const [passportData, setPassportData] = useState(initial.passportData);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const roleRu = roleLabels[initial.roleLabel] ?? initial.roleLabel;
  const selectedCar = cars.find((c) => c.id === carId);

  const rentalDays = useMemo(() => {
    if (!startDate || !endDate) return null;
    const a = parseDateInput(startDate);
    const b = parseDateInput(endDate);
    if (!a || !b || b < a) return null;
    const days = inclusiveRentalDays(a, b);
    return days >= 1 ? days : null;
  }, [startDate, endDate]);

  const totalNum = useMemo(() => {
    const n = Number.parseInt(totalPriceRub.replace(/\s/g, ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [totalPriceRub]);

  const averagePerDay = useMemo(() => {
    if (rentalDays === null || totalNum === null) return null;
    return Math.round(totalNum / rentalDays);
  }, [rentalDays, totalNum]);

  function onPaymentStatusChange(next: AdminBookingPaymentStatus) {
    setPaymentStatus(next);
    if (next === "PENDING_PAYMENT") {
      setPaidAmountRub("0");
    } else if (next === "PAID" && totalNum !== null) {
      setPaidAmountRub(String(totalNum));
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
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

    const user: AdminUserProfilePayload = {
      email,
      lastName,
      firstName,
      patronymic,
      phone,
      address: initial.address,
      passportData,
    };

    setPending(true);
    const res = await updateAdminOrderAction({
      bookingId: initial.bookingId,
      carId,
      startDate,
      endDate,
      totalPriceRub: total,
      paidAmountRub: paid,
      paymentStatus,
      adminComment,
      user,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(cancelHref);
    router.refresh();
  }

  async function onDeleteOrder() {
    if (
      !window.confirm(
        "Удалить заказ? Бронь будет отменена и исчезнет из календаря. Это действие необратимо.",
      )
    ) {
      return;
    }
    setError(null);
    setPending(true);
    const res = await cancelAdminOrderAction(initial.bookingId);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(cancelHref);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "36rem" }}>
      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
        Роль клиента: <strong style={{ color: "var(--color-text)" }}>{roleRu}</strong>
      </p>

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
          Бронь
        </legend>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
          Автомобиль
          <select
            value={carId}
            onChange={(e) => setCarId(e.target.value)}
            required
            style={fieldStyle}
          >
            {cars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
          Дата начала аренды
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={fieldStyle}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
          Дата окончания аренды
          <input
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
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
              if (paymentStatus === "PAID") {
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
            <strong style={{ color: "var(--color-text)" }}>{formatPriceRub(averagePerDay)}</strong> (
            {formatPriceRub(totalNum!)} ÷ {rentalDays} сут.)
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
            disabled={paymentStatus === "PENDING_PAYMENT"}
            style={{
              ...fieldStyle,
              opacity: paymentStatus === "PENDING_PAYMENT" ? 0.7 : 1,
            }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
          Статус оплаты
          <select
            name="paymentStatus"
            value={paymentStatus}
            onChange={(e) => onPaymentStatusChange(e.target.value as AdminBookingPaymentStatus)}
            style={fieldStyle}
          >
            <option value="PENDING_PAYMENT">Ожидает оплаты</option>
            <option value="PARTIALLY_PAID">Внесена предоплата</option>
            <option value="PAID">Полная оплата</option>
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
          Комментарий к заказу
          <textarea
            name="adminComment"
            rows={3}
            value={adminComment}
            onChange={(e) => setAdminComment(e.target.value)}
            placeholder="Заметки для администраторов (клиент не видит)"
            style={{ ...fieldStyle, resize: "vertical", minHeight: "4rem" }}
          />
        </label>
      </fieldset>

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
          Клиент
        </legend>

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
          Паспорт (серия, номер, кем и когда выдан)
          <textarea
            name="passportData"
            rows={4}
            value={passportData}
            onChange={(e) => setPassportData(e.target.value)}
            style={{ ...fieldStyle, resize: "vertical", minHeight: "5rem" }}
          />
        </label>

        <p style={{ margin: 0, fontSize: "var(--text-sm)" }}>
          <Link href={`/admin-panel/users/${initial.userId}/edit`} style={{ fontWeight: 600 }}>
            Только карточка пользователя
          </Link>
        </p>
      </fieldset>

      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-danger, #b00020)" }}>
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
          onClick={onDeleteOrder}
          style={{
            padding: "0.65rem 1.25rem",
            borderRadius: "999px",
            border: "1px solid var(--color-danger, #b00020)",
            background: "var(--color-danger, #b00020)",
            color: "#fff",
            fontWeight: 600,
            cursor: pending ? "wait" : "pointer",
          }}
        >
          Удалить заказ
        </button>
        <Link href={cancelHref} style={{ fontSize: "var(--text-sm)" }}>
          Отмена
        </Link>
      </div>
    </form>
  );
}
