"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setDocDestinationAction, setLineEstimateAction } from "@/app/actions/repair";

export type EstimateOption = { id: string; label: string; group: string };

/** Выбор строки сметы для строки накладной (сохраняется сразу). */
export function LineEstimateSelect({ lineId, value, options }: { lineId: string; value: string; options: EstimateOption[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const groups = [...new Set(options.map((o) => o.group))];
  return (
    <span>
      <select
        defaultValue={value}
        disabled={pending}
        style={{ maxWidth: "26rem", width: "100%" }}
        onChange={(e) => {
          const v = e.target.value;
          setErr(null);
          start(async () => {
            const r = await setLineEstimateAction(lineId, v);
            if (!r.ok) setErr(r.error);
            router.refresh();
          });
        }}
      >
        <option value="">— вне сметы —</option>
        {groups.map((g) => (
          <optgroup key={g} label={g}>
            {options
              .filter((o) => o.group === g)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      {err ? <span style={{ color: "#c0392b", marginLeft: "0.5rem" }}>{err}</span> : null}
    </span>
  );
}

/** Накладная из Рубина без пометки — указать, для чего товар. */
export function DestinationButtons({ docId, current }: { docId: string; current: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const btn = (dest: "akirtava" | "palma", label: string) => (
    <button
      type="button"
      disabled={pending || current === dest}
      onClick={() =>
        start(async () => {
          const r = await setDocDestinationAction(docId, dest);
          if (!r.ok) setErr(r.error);
          router.refresh();
        })
      }
      style={{ marginRight: "0.4rem", padding: "0.2rem 0.7rem", borderRadius: "999px", border: "1px solid var(--color-accent)", background: current === dest ? "var(--color-accent)" : "transparent", color: current === dest ? "#fff" : "var(--color-accent)", cursor: "pointer" }}
    >
      {label}
    </button>
  );
  return (
    <span>
      {btn("akirtava", "Это Акиртава")}
      {btn("palma", "Это Пальма")}
      {err ? <span style={{ color: "#c0392b" }}>{err}</span> : null}
    </span>
  );
}
