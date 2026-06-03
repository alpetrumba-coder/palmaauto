"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";

import { cancelAdminOrderAction, updateAdminOrderAction } from "@/app/actions/admin-orders";
import type { AdminUserProfilePayload } from "@/app/actions/admin-users";
import { bookingStatusLabelRu } from "@/lib/admin-order-labels";
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

export type CarOption = { id: string; label: string };

export type OrderEditFormInitial = {
  bookingId: string;
  userId: string;
  roleLabel: string;
  status: BookingStatus;
  totalPriceRub: number;
  carId: string;
  startDate: string;
  endDate: string;
  paidAmountRub: number;
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
  const [paidAmountRub, setPaidAmountRub] = useState(String(initial.paidAmountRub));
  const [email, setEmail] = useState(initial.email);
  const [lastName, setLastName] = useState(initial.lastName);
  const [firstName, setFirstName] = useState(initial.firstName);
  const [patronymic, setPatronymic] = useState(initial.patronymic);
  const [phone, setPhone] = useState(initial.phone);
  const [address, setAddress] = useState(initial.address);
  const [passportData, setPassportData] = useState(initial.passportData);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const roleRu = roleLabels[initial.roleLabel] ?? initial.roleLabel;
  const statusRu = bookingStatusLabelRu[initial.status] ?? initial.status;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const paid = Number.parseInt(paidAmountRub.replace(/\s/g, ""), 10);
    if (!Number.isFinite(paid) || paid < 0) {
      setError("Укажите корректную сумму предоплаты (целое число, ₽).");
      return;
    }

    const user: AdminUserProfilePayload = {
      email,
      lastName,
      firstName,
      patronymic,
      phone,
      address,
      passportData,
    };

    setPending(true);
    const res = await updateAdminOrderAction({
      bookingId: initial.bookingId,
      carId,
      startDate,
      endDate,
      paidAmountRub: paid,
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
        Статус заказа: <strong style={{ color: "var(--color-text)" }}>{statusRu}</strong>
        {" · "}
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

        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
          Размер предоплаты, ₽
          <input
            type="number"
            min={0}
            step={1}
            required
            value={paidAmountRub}
            onChange={(e) => setPaidAmountRub(e.target.value)}
            style={fieldStyle}
          />
        </label>

        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          Сумма заказа пересчитается при сохранении по тарифу выбранного авто и датам (сейчас в БД:{" "}
          {initial.totalPriceRub.toLocaleString("ru-RU")} ₽).
        </p>
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
