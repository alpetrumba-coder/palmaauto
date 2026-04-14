"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";

import { createAdminBookingAction } from "@/app/actions/admin-bookings";
import { formatBookingUserLabel } from "@/lib/booking-display";
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

export type AdminBookingUserOption = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  patronymic: string | null;
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
  users: AdminBookingUserOption[];
  cars: AdminBookingCarOption[];
  minDateStr: string;
  initialCarId?: string;
  initialFrom?: string;
  initialTo?: string;
};

function userLabel(u: AdminBookingUserOption): string {
  const name = formatBookingUserLabel(u);
  return name === u.email ? u.email : `${u.email} — ${name}`;
}

export function AdminBookingForm({
  users,
  cars,
  minDateStr,
  initialCarId,
  initialFrom,
  initialTo,
}: AdminBookingFormProps) {
  const router = useRouter();
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [carId, setCarId] = useState(() => {
    if (initialCarId && cars.some((c) => c.id === initialCarId)) return initialCarId;
    return cars[0]?.id ?? "";
  });
  const [start, setStart] = useState(initialFrom ?? "");
  const [end, setEnd] = useState(initialTo ?? "");
  const [status, setStatus] = useState<"PENDING_PAYMENT" | "PAID">("PENDING_PAYMENT");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selectedCar = cars.find((c) => c.id === carId);

  const preview = useMemo(() => {
    if (!start || !end || !selectedCar) return null;
    const a = parseDateInput(start);
    const b = parseDateInput(end);
    if (!a || !b || b < a) return null;
    const days = inclusiveRentalDays(a, b);
    if (days < 1) return null;
    return { days, total: days * selectedCar.pricePerDayRub };
  }, [start, end, selectedCar]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!userId || !carId) {
      setError("Выберите клиента и автомобиль.");
      return;
    }
    setPending(true);
    const res = await createAdminBookingAction({
      userId,
      carId,
      startDate: start,
      endDate: end,
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

  if (users.length === 0) {
    return (
      <p style={{ color: "var(--color-text-secondary)" }}>
        Нет пользователей в базе. Сначала зарегистрируйте клиента на сайте или создайте учётную запись.
      </p>
    );
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
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Клиент
        <select
          name="userId"
          required
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={fieldStyle}
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {userLabel(u)}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Автомобиль
        <select name="carId" required value={carId} onChange={(e) => setCarId(e.target.value)} style={fieldStyle}>
          {cars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.make} {c.model}
              {!c.active ? " (скрыт в каталоге)" : ""} — {formatPriceRub(c.pricePerDayRub)}/сут.
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

      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Статус
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as "PENDING_PAYMENT" | "PAID")}
          style={fieldStyle}
        >
          <option value="PENDING_PAYMENT">Ожидает оплаты</option>
          <option value="PAID">Оплачено</option>
        </select>
      </label>

      {preview && selectedCar ? (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          {preview.days} сут. × {formatPriceRub(selectedCar.pricePerDayRub)} ={" "}
          <strong style={{ color: "var(--color-text)" }}>{formatPriceRub(preview.total)}</strong>
        </p>
      ) : null}

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
