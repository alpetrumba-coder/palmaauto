import Link from "next/link";

/**
 * Главная страница (маршрут `/`).
 * Статический лендинг этапа 1; блок каталога — заглушка до этапа 2.
 */
export default function HomePage() {
  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(3rem, 10vw, 5rem)" }}>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--color-text-secondary)",
          marginBottom: "var(--space-unit)",
        }}
      >
        Прокат автомобилей
      </p>
      <h1 style={{ fontSize: "var(--text-hero)", margin: "0 0 calc(var(--space-unit) * 2)" }}>
        ПальмаАвто
      </h1>
      <p
        style={{
          fontSize: "var(--text-xl)",
          color: "var(--color-text-secondary)",
          maxWidth: "36rem",
          lineHeight: "var(--leading-relaxed)",
          margin: 0,
        }}
      >
        Удобный выбор машины и бронирование на даты поездки: каталог с ценами за сутки, подбор свободных авто по
        датам и бронь после входа в аккаунт.
      </p>

      <div style={{ marginTop: "calc(var(--space-unit) * 3)", display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        <Link
          href="/cars"
          className="nav-tap-target cta-link"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.85rem 1.5rem",
            borderRadius: "999px",
            background: "var(--color-accent)",
            color: "#fff",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          Смотреть каталог
        </Link>
        <Link
          href="/book"
          className="nav-tap-target"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.85rem 1.5rem",
            borderRadius: "999px",
            border: "1px solid var(--color-border)",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            textDecoration: "none",
            color: "var(--color-text)",
          }}
        >
          Подобрать по датам
        </Link>
      </div>

      <p style={{ marginTop: "calc(var(--space-unit) * 4)", fontSize: "var(--text-sm)" }}>
        <Link href="/staff" className="nav-tap-target">
          Внутренняя зона (заглушка для сотрудников)
        </Link>
      </p>
    </div>
  );
}
