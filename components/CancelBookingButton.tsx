"use client";

import { useState } from "react";

import { cancelBookingAction } from "@/app/actions/bookings";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (!window.confirm("Отменить эту бронь?")) return;
    setPending(true);
    const res = await cancelBookingAction(bookingId);
    setPending(false);
    if (!res.ok) {
      window.alert(res.error);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="nav-tap-target"
      style={{
        fontSize: "var(--text-sm)",
        padding: "0.35rem 0.65rem",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-border)",
        background: "transparent",
        cursor: pending ? "wait" : "pointer",
        color: "var(--color-text)",
      }}
    >
      {pending ? "…" : "Отменить"}
    </button>
  );
}
