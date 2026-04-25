import { BookByDatesSection } from "@/components/BookByDatesSection";
import { CarCatalogGrid } from "@/components/CarCatalogGrid";
import { CancellationPolicyModal } from "@/components/CancellationPolicyModal";
import { getActiveCars } from "@/lib/cars";
import { buildFaqJsonLd, buildOrganizationJsonLd, buildWebSiteJsonLd, jsonLdScriptTag } from "@/lib/seo-jsonld";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Прокат автомобилей в Абхазии",
  description:
    "ПальмаАвто — прокат автомобилей в Абхазии. Подбор по датам, доставка на границу/вокзал/аэропорт, скидки от 7 суток. Бесплатная отмена за 3 суток.",
  alternates: { canonical: "/" },
};

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

  const baseUrl = "https://palmaauto.ru";
  const jsonLd = [
    buildOrganizationJsonLd({
      url: baseUrl,
      name: "ПальмаАвто",
      email: "palm@tdrubin.com",
      phone: "+79407146273",
      logoUrl: `${baseUrl}/logo.svg`,
    }),
    buildWebSiteJsonLd({ url: baseUrl, name: "ПальмаАвто" }),
    buildFaqJsonLd([
      { question: "Какая отмена бесплатная?", answer: "Бесплатная отмена возможна не позднее чем за 3 суток до начала аренды. Если позже — удерживается оплата за первые сутки." },
      { question: "Есть ли доставка?", answer: "Да, возможна доставка на границу/вокзал/аэропорт по договорённости." },
      { question: "Какой залог?", answer: "Залог 15 000 ₽ и возвращается при сдаче автомобиля при отсутствии страховых случаев." },
    ]),
  ];

  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(3rem, 10vw, 5rem)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd.map((j) => jsonLdScriptTag(j)).join("\n") }}
      />
      <p
        style={{
          fontSize: "var(--text-lg)",
          color: "var(--color-text-secondary)",
          marginBottom: "var(--space-unit)",
        }}
      >
        Прокат автомобилей в Абхазии
      </p>
      <h1 style={{ fontSize: "var(--text-hero)", margin: "0 0 calc(var(--space-unit) * 2)", letterSpacing: "0.02em" }}>
        ПАЛЬМААВТО
      </h1>
      <ul
        style={{
          fontSize: "var(--text-xl)",
          color: "var(--color-text-secondary)",
          maxWidth: "44rem",
          lineHeight: "var(--leading-relaxed)",
          margin: 0,
          paddingLeft: "1.25rem",
        }}
      >
        <li style={{ marginBottom: "0.55rem" }}>От 7 суток — скидки</li>
        <li style={{ marginBottom: "0.55rem" }}>Доставка машины на границу / вокзал / аэропорт</li>
        <li style={{ marginBottom: "0.55rem" }}>
          Бесплатная отмена (
          <span style={{ whiteSpace: "nowrap" }}>
            прочитать <CancellationPolicyModal />
          </span>
          )
        </li>
      </ul>

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
