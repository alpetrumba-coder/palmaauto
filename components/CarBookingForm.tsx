"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";

import { createBookingAction } from "@/app/actions/bookings";
import { formatPriceRub } from "@/lib/formatPrice";
import { inclusiveRentalDays, parseDateInput } from "@/lib/rental-dates";

type CarBookingFormProps = {
  carId: string;
  slug: string;
  pricePerDayRub: number;
  minDateStr: string;
};

const inputStyle: CSSProperties = {
  width: "100%",
  maxWidth: "16rem",
  padding: "0.5rem 0.65rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  fontSize: "var(--text-base)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
};

export function CarBookingForm({ carId, slug, pricePerDayRub, minDateStr }: CarBookingFormProps) {
  const { data: session, status } = useSession();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!session?.user) return;
    setPending(true);
    const res = await createBookingAction({ carId, startDate: start, endDate: end });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSuccess(true);
    setStart("");
    setEnd("");
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
        maxWidth: "28rem",
      }}
    >
      <p style={{ margin: "0 0 1rem", fontSize: "var(--text-base)", fontWeight: 600 }}>Бронирование</p>
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
            <span style={{ display: "block", marginTop: "0.25rem" }}>Оплата — на следующем этапе.</span>
          </p>
        ) : null}
        {error ? (
          <p role="alert" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-danger, #c00)" }}>
            {error}
          </p>
        ) : null}
        {success ? (
          <p role="status" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
            Бронь создана. Список — в{" "}
            <Link href="/account" style={{ fontWeight: 600 }}>
              личном кабинете
            </Link>
            .
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="nav-tap-target"
          style={{
            alignSelf: "flex-start",
            padding: "0.65rem 1.25rem",
            borderRadius: "999px",
            border: "none",
            background: "var(--color-accent)",
            color: "#fff",
            fontWeight: 600,
            cursor: pending ? "wait" : "pointer",
          }}
        >
          {pending ? "Создание…" : "Забронировать"}
        </button>
      </form>
    </div>
  );
}
