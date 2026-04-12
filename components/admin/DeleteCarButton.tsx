"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteCarAction } from "@/app/actions/admin-cars";

export function DeleteCarButton({ carId, slug }: { carId: string; slug: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (!window.confirm(`Удалить «${slug}»? Связанные брони и фото будут удалены.`)) return;
    setPending(true);
    const res = await deleteCarAction(carId);
    setPending(false);
    if (!res.ok) {
      window.alert(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      style={{
        fontSize: "var(--text-sm)",
        padding: "0.25rem 0.5rem",
        border: "none",
        background: "transparent",
        color: "var(--color-danger, #b00020)",
        cursor: pending ? "wait" : "pointer",
        textDecoration: "underline",
      }}
    >
      {pending ? "…" : "Удалить"}
    </button>
  );
}
