import { BookByDatesSection } from "@/components/BookByDatesSection";
import { CarCatalogGrid } from "@/components/CarCatalogGrid";
import { getActiveCars } from "@/lib/cars";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Главная: лендинг + каталог автомобилей из БД.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const cars = await getActiveCars();

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
          maxWidth: "40rem",
          lineHeight: "var(--leading-relaxed)",
          margin: 0,
        }}
      >
        📈Стоимость зависит от бронируемого периода.
        <br />
        Длительная аренда авто – цена договорная.
        <br />
        <br />
        🤝Составляем договор в 2х экземплярах
        <br />
        ✅ Залог 15000 ₽ возвращается сразу при сдаче авто
        <br />
        ✅ Для бpониpoвания и офoрмления договора потребуется паспорт РФ и права РФ
        <br />
        ✅Транспорт можно получить на стоянке арендодателя.
        <br />
        ✅ Возможна доставка в Сухумский аэропорт, на жд вокзал Сухума и по городу по договоренности.
      </p>

      <section
        style={{ marginTop: "calc(var(--space-unit) * 2)" }}
        aria-labelledby="home-book-by-dates-heading"
      >
        <h2
          id="home-book-by-dates-heading"
          style={{
            fontSize: "var(--text-2xl)",
            fontWeight: 600,
            margin: "0 0 0.5rem",
            letterSpacing: "-0.02em",
          }}
        >
          Подбор по датам
        </h2>
        <p
          style={{
            margin: "0 0 1.25rem",
            fontSize: "var(--text-base)",
            color: "var(--color-text-secondary)",
            maxWidth: "42rem",
            lineHeight: "var(--leading-relaxed)",
          }}
        >
          Укажите даты проката и нажмите «Показать доступные» — ниже списком: фото, название и цена за сутки; можно сразу
          перейти к бронированию.
        </p>
        <BookByDatesSection action="/" fromStr={sp.from ?? ""} toStr={sp.to ?? ""} resultsLayout="list" />
      </section>

      <section style={{ marginTop: "calc(var(--space-unit) * 4)" }}>
        <h2 style={{ fontSize: "var(--text-3xl)", margin: "0 0 0.75rem" }}>Автомобили</h2>
        <p
          style={{
            fontSize: "var(--text-lg)",
            color: "var(--color-text-secondary)",
            maxWidth: "40rem",
            lineHeight: "var(--leading-relaxed)",
            margin: "0 0 calc(var(--space-unit) * 3)",
          }}
        >
          Выберите класс и бюджет — цена за сутки; подробнее на карточке машины.
        </p>
        <CarCatalogGrid cars={cars} />
      </section>
    </div>
  );
}
