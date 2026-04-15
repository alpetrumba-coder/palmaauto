"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";

import {
  createExtraServiceAction,
  updateExtraServiceAction,
  type ExtraServiceFormPayload,
} from "@/app/actions/extra-services";

const fieldStyle: CSSProperties = {
  width: "100%",
  maxWidth: "36rem",
  padding: "0.55rem 0.65rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  fontSize: "var(--text-base)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
};

export type ExtraServiceFormInitial = {
  name: string;
  pricePerDayRub: number;
  nonDailyPriceText: string;
  sortOrder: number;
  active: boolean;
};

type ExtraServiceFormProps =
  | { mode: "create" }
  | { mode: "edit"; serviceId: string; initial: ExtraServiceFormInitial };

export function ExtraServiceForm(props: ExtraServiceFormProps) {
  const router = useRouter();
  const initial =
    props.mode === "edit"
      ? props.initial
      : {
          name: "",
          pricePerDayRub: 0,
          nonDailyPriceText: "",
          sortOrder: 0,
          active: true,
        };

  const [name, setName] = useState(initial.name);
  const [pricePerDayRub, setPricePerDayRub] = useState(String(initial.pricePerDayRub));
  const [nonDailyPriceText, setNonDailyPriceText] = useState(initial.nonDailyPriceText);
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder));
  const [active, setActive] = useState(initial.active);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const pdr = Number.parseInt(pricePerDayRub.replace(/\s/g, ""), 10);
    const so = Number.parseInt(sortOrder.replace(/\s/g, ""), 10);
    const payload: ExtraServiceFormPayload = {
      name,
      pricePerDayRub: Number.isFinite(pdr) ? pdr : -1,
      nonDailyPriceText,
      sortOrder: Number.isFinite(so) ? so : -1,
      active,
    };
    setPending(true);
    const res =
      props.mode === "create"
        ? await createExtraServiceAction(payload)
        : await updateExtraServiceAction(props.serviceId, payload);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/admin-panel/extra-services");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Название услуги
        <textarea
          required
          rows={3}
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ ...fieldStyle, maxWidth: "100%", minHeight: "4.5rem", resize: "vertical" }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)", maxWidth: "14rem" }}>
        Цена за сутки, ₽ (0 — если не за сутки)
        <input
          required
          type="number"
          min={0}
          value={pricePerDayRub}
          onChange={(e) => setPricePerDayRub(e.target.value)}
          style={fieldStyle}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Текст цены в прейскуранте, если не «за сутки» (например: 500, по стоимости топлива + 10%)
        <input
          value={nonDailyPriceText}
          onChange={(e) => setNonDailyPriceText(e.target.value)}
          placeholder="Обязательно, если цена за сутки = 0"
          style={{ ...fieldStyle, maxWidth: "100%" }}
        />
      </label>
      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
        В PDF во второй колонке будет «N / сутки», если цена за сутки больше 0; иначе — текст из поля выше.
      </p>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)", maxWidth: "12rem" }}>
        Порядок в списке
        <input
          required
          type="number"
          min={0}
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          style={fieldStyle}
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "var(--text-sm)", cursor: "pointer" }}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Услуга активна (показывается в договоре)
      </label>

      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-danger, #c00)" }}>
          {error}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="submit"
          disabled={pending}
          className="nav-tap-target"
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
          {pending ? "Сохранение…" : props.mode === "create" ? "Создать" : "Сохранить"}
        </button>
        <Link href="/admin-panel/extra-services" style={{ fontSize: "var(--text-sm)" }}>
          Отмена
        </Link>
      </div>
    </form>
  );
}
