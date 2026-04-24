"use client";

import { useCallback, useEffect, useId, useState } from "react";

export function CancellationPolicyModal() {
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const [open, setOpen] = useState(false);

  const onClose = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <>
      <button
        type="button"
        className="nav-tap-target"
        onClick={() => setOpen(true)}
        style={{
          padding: 0,
          border: "none",
          background: "none",
          color: "var(--color-accent)",
          fontWeight: 600,
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        условия отмены
      </button>

      {open ? (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            background: "rgba(0,0,0,0.45)",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            style={{
              width: "min(34rem, 100%)",
              maxHeight: "min(70vh, 32rem)",
              overflow: "auto",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg)",
              color: "var(--color-text)",
              boxShadow: "0 18px 60px rgba(0,0,0,0.25)",
              padding: "1rem 1.1rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
              <h2 id={titleId} style={{ margin: 0, fontSize: "var(--text-xl)" }}>
                Условия отмены брони
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="nav-tap-target"
                aria-label="Закрыть"
                style={{
                  borderRadius: "999px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  width: "2.25rem",
                  height: "2.25rem",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginTop: "0.85rem", fontSize: "var(--text-sm)", lineHeight: "var(--leading-relaxed)" }}>
              <p style={{ margin: "0 0 0.75rem" }}>
                <strong>Бесплатная отмена</strong> возможна, если отмена сделана{" "}
                <strong>не позднее чем за 3 суток до даты начала аренды</strong> (по дате начала брони).
              </p>
              <p style={{ margin: 0 }}>
                Если отмена сделана <strong>позже</strong>, чем за 3 суток до начала аренды, удерживается{" "}
                <strong>оплата за первые сутки</strong> (в соответствии с выбранным вариантом оплаты/условиями брони).
              </p>
            </div>

            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={onClose}
                className="nav-tap-target"
                style={{
                  padding: "0.65rem 1.1rem",
                  borderRadius: "999px",
                  border: "none",
                  background: "var(--color-accent)",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
