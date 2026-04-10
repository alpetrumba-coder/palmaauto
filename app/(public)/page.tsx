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
        Удобный выбор машины и бронирование на даты поездки. Сейчас — каркас сайта; каталог и бронь
        появятся на следующих этапах.
      </p>

      <div className="catalog-placeholder" role="status" aria-label="Каталог в разработке">
        Здесь будет каталог автомобилей с фото и ценами за сутки.
      </div>

      <p style={{ marginTop: "calc(var(--space-unit) * 4)", fontSize: "var(--text-sm)" }}>
        <Link href="/staff" className="nav-tap-target">
          Внутренняя зона (заглушка для сотрудников)
        </Link>
      </p>
    </div>
  );
}
