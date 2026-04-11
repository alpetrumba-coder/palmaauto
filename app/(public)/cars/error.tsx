"use client";

import Link from "next/link";

/**
 * Ошибка при загрузке каталога (часто нет DATABASE_URL на Vercel или не применены миграции).
 */
export default function CarsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3.5rem)", maxWidth: "40rem" }}>
      <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 0 }}>Не удалось загрузить каталог</h1>
      <p style={{ color: "var(--color-text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
        Проверьте в панели Vercel переменную окружения{" "}
        <code style={{ fontSize: "0.9em" }}>DATABASE_URL</code> и что к базе применены миграции (
        <code style={{ fontSize: "0.9em" }}>prisma migrate deploy</code> выполняется при сборке).
      </p>
      {process.env.NODE_ENV === "development" && error.message ? (
        <pre
          style={{
            marginTop: "1rem",
            padding: "1rem",
            fontSize: "var(--text-sm)",
            background: "var(--color-border)",
            borderRadius: "var(--radius-md)",
            overflow: "auto",
          }}
        >
          {error.message}
        </pre>
      ) : null}
      <p style={{ marginTop: "calc(var(--space-unit) * 2)", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => reset()}
          className="nav-tap-target"
          style={{
            padding: "0.65rem 1.1rem",
            borderRadius: "999px",
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
          }}
        >
          Попробовать снова
        </button>
        <Link href="/" className="nav-tap-target" style={{ fontSize: "var(--text-sm)", alignSelf: "center" }}>
          На главную
        </Link>
      </p>
    </div>
  );
}
