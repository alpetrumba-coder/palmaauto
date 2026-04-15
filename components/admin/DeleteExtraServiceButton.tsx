"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteExtraServiceAction } from "@/app/actions/extra-services";

export function DeleteExtraServiceButton({ serviceId, label }: { serviceId: string; label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (!window.confirm(`Удалить услугу «${label.slice(0, 80)}${label.length > 80 ? "…" : ""}»?`)) return;
    setPending(true);
    const res = await deleteExtraServiceAction(serviceId);
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
