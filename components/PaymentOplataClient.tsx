"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { cancelBookingAction } from "@/app/actions/bookings";
import { checkAmobilePaymentStatusAction, createAmobilePayLinkAction } from "@/app/actions/booking-payment";
import { formatPriceRub } from "@/lib/formatPrice";

type PaymentOplataClientProps = {
  bookingId: string;
  /** Время окончания удержания (Date.now() при открытии страницы учтено на сервере). */
  deadlineMs: number;
  carTitle: string;
  totalPriceRub: number;
  firstDayAmountRub: number;
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
  firstDayAmountRub,
  dateRangeLabel,
}: PaymentOplataClientProps) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)),
  );
  const [payPending, setPayPending] = useState(false);
  const [checkPending, setCheckPending] = useState(false);
  const [paymentWindowOpened, setPaymentWindowOpened] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [plan, setPlan] = useState<"FULL" | "FIRST_DAY">("FULL");
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
    setInfo(null);
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      setError("Браузер заблокировал окно оплаты. Разрешите всплывающие окна для palmaauto.ru и попробуйте ещё раз.");
      return;
    }
    popup.opener = null;
    popup.document.write("<p>Готовим ссылку на оплату...</p>");
    setPayPending(true);
    const res = await createAmobilePayLinkAction(bookingId, plan);
    setPayPending(false);
    if (!res.ok) {
      popup.close();
      setError(res.error);
      return;
    }
    popup.location.href = res.link;
    setPaymentWindowOpened(true);
    setInfo("Оплата открыта в новой вкладке. После оплаты в банке закройте вкладку оплаты и нажмите «Я оплатил, проверить».");
  }, [bookingId, plan]);

  const onCheckPayment = useCallback(async () => {
    setError(null);
    setInfo(null);
    setCheckPending(true);
    const res = await checkAmobilePaymentStatusAction(bookingId);
    setCheckPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (!res.paid) {
      setInfo(res.message);
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
      {info ? (
        <p role="status" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          {info}
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
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <fieldset style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "0.9rem 1rem" }}>
            <legend style={{ paddingInline: "0.35rem", fontWeight: 600, fontSize: "var(--text-sm)" }}>Сумма к оплате</legend>
            <label style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="radio"
                name="plan"
                value="FULL"
                checked={plan === "FULL"}
                onChange={() => setPlan("FULL")}
                disabled={payPending || checkPending}
                style={{ marginTop: "0.15rem" }}
              />
              <span style={{ fontSize: "var(--text-sm)" }}>
                <strong>Оплатить полностью</strong> — {formatPriceRub(totalPriceRub)}
              </span>
            </label>
            <label style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", cursor: "pointer", marginTop: "0.6rem" }}>
              <input
                type="radio"
                name="plan"
                value="FIRST_DAY"
                checked={plan === "FIRST_DAY"}
                onChange={() => setPlan("FIRST_DAY")}
                disabled={payPending || checkPending}
                style={{ marginTop: "0.15rem" }}
              />
              <span style={{ fontSize: "var(--text-sm)" }}>
                <strong>Оплатить первые сутки</strong> — {formatPriceRub(firstDayAmountRub)}
              </span>
            </label>
          </fieldset>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="button"
            disabled={payPending || checkPending}
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
            {payPending ? "…" : paymentWindowOpened ? "Открыть оплату снова" : "Оплатить"}
          </button>
          <button
            type="button"
            disabled={payPending || checkPending}
            onClick={() => void onCheckPayment()}
            className="nav-tap-target"
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "999px",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg)",
              color: "var(--color-text)",
              fontWeight: 600,
              cursor: checkPending ? "wait" : "pointer",
            }}
          >
            {checkPending ? "Проверяем…" : paymentWindowOpened ? "Я оплатил, проверить" : "Проверить оплату"}
          </button>
          <button
            type="button"
            disabled={cancelPending || checkPending}
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
        </div>
      )}

      {!expired ? (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          Оплата откроется в новой вкладке. После списания вернитесь сюда и нажмите «Я оплатил, проверить».
        </p>
      ) : null}
    </div>
  );
}
