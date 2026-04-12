"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { cancelBookingAction } from "@/app/actions/bookings";
import { completeFakePaymentAction } from "@/app/actions/booking-payment";
import { formatPriceRub } from "@/lib/formatPrice";

type PaymentOplataClientProps = {
  bookingId: string;
  /** Время окончания удержания (Date.now() при открытии страницы учтено на сервере). */
  deadlineMs: number;
  carTitle: string;
  totalPriceRub: number;
  dateRangeLabel: string;
};

function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function PaymentOplataClient({
  bookingId,
  deadlineMs,
  carTitle,
  totalPriceRub,
  dateRangeLabel,
}: PaymentOplataClientProps) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)),
  );
  const [payPending, setPayPending] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshedAfterExpiry = useRef(false);

  useEffect(() => {
    const t = window.setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(t);
  }, [deadlineMs]);

  const expired = secondsLeft <= 0;

  useEffect(() => {
    if (secondsLeft <= 0 && !refreshedAfterExpiry.current) {
      refreshedAfterExpiry.current = true;
      router.refresh();
    }
  }, [secondsLeft, router]);

  const onPay = useCallback(async () => {
    setError(null);
    setPayPending(true);
    const res = await completeFakePaymentAction(bookingId);
    setPayPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    window.location.assign(`/oplata/${bookingId}/checkout`);
  }, [bookingId]);

  const onCancel = useCallback(async () => {
    setError(null);
    setCancelPending(true);
    const res = await cancelBookingAction(bookingId);
    setCancelPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/");
    router.refresh();
  }, [bookingId, router]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "28rem" }}>
      <div
        style={{
          padding: "1rem 1.15rem",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          background: expired ? "var(--color-surface)" : "color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))",
        }}
      >
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          {expired ? "Время на оплату истекло" : "Оплатите в течение"}
        </p>
        <p
          style={{
            margin: "0.35rem 0 0",
            fontSize: "var(--text-3xl)",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "0.02em",
          }}
        >
          {expired ? "—" : formatCountdown(secondsLeft)}
        </p>
      </div>

      <div style={{ fontSize: "var(--text-base)" }}>
        <p style={{ margin: "0 0 0.35rem", fontWeight: 600 }}>{carTitle}</p>
        <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>{dateRangeLabel}</p>
        <p style={{ margin: "0.5rem 0 0", fontSize: "var(--text-lg)", fontWeight: 600 }}>{formatPriceRub(totalPriceRub)}</p>
      </div>

      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-danger, #c00)" }}>
          {error}
        </p>
      ) : null}

      {expired ? (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          Слот освобождён. Вы можете{" "}
          <Link href="/" style={{ fontWeight: 600 }}>
            вернуться на главную
          </Link>{" "}
          и выбрать даты снова.
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="button"
            disabled={payPending}
            onClick={() => void onPay()}
            className="nav-tap-target"
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "999px",
              border: "none",
              background: "var(--color-accent)",
              color: "#fff",
              fontWeight: 600,
              cursor: payPending ? "wait" : "pointer",
            }}
          >
            {payPending ? "…" : "Оплатить"}
          </button>
          <button
            type="button"
            disabled={cancelPending}
            onClick={() => void onCancel()}
            className="nav-tap-target"
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "999px",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg)",
              color: "var(--color-text)",
              fontWeight: 600,
              cursor: cancelPending ? "wait" : "pointer",
            }}
          >
            {cancelPending ? "…" : "Отмена"}
          </button>
        </div>
      )}

      {!expired ? (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          «Оплатить» сейчас ведёт на страницу успешного оформления (без реального списания). Платёжный шлюз добавим позже.
        </p>
      ) : null}
    </div>
  );
}
