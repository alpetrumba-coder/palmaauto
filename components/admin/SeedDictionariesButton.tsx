"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { seedDictionariesAction } from "@/app/actions/admin-dictionaries";

/** Кнопка стартового заполнения справочников (только владелец). Повторное нажатие ничего не перезаписывает. */
export function SeedDictionariesButton({ isEmpty }: { isEmpty: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setMessage(null);
    setError(null);
    const res = await seedDictionariesAction();
    setPending(false);
    if (res.ok) {
      setMessage(res.message);
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <div
      style={{
        margin: "0 0 1.25rem",
        padding: "0.85rem 1rem",
        border: "1px dashed var(--color-border)",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--text-sm)",
        display: "flex",
        gap: "0.85rem",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <span style={{ color: "var(--color-text-secondary)", maxWidth: "42rem" }}>
        {isEmpty
          ? "Справочники пусты. Можно загрузить стартовые данные из ваших файлов: 14 квартир и 4 машины, 7 касс, статьи, площадки, проекты."
          : "Загрузить недостающие стартовые данные. Существующие записи и ваши правки не меняются."}
      </span>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="nav-tap-target"
        style={{
          padding: "0.5rem 1rem",
          borderRadius: "999px",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-text)",
          cursor: pending ? "wait" : "pointer",
          fontSize: "var(--text-sm)",
        }}
      >
        {pending ? "Загрузка…" : "Заполнить стартовыми данными"}
      </button>
      {message ? <span role="status">{message}</span> : null}
      {error ? (
        <span role="alert" style={{ color: "var(--color-danger, #b00020)" }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
