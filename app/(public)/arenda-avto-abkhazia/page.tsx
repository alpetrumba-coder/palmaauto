import Link from "next/link";

import { BookByDatesSection } from "@/components/BookByDatesSection";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, jsonLdScriptTag } from "@/lib/seo-jsonld";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Аренда авто в Абхазии — ПальмаАвто",
  description:
    "Аренда автомобиля в Абхазии: подбор по датам, доставка на границу/вокзал/аэропорт, скидки от 7 суток. ПальмаАвто.",
  alternates: { canonical: "/arenda-avto-abkhazia" },
};

export default async function ArendaAvtoAbkhaziaPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const base = "https://palmaauto.ru";
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Главная", url: `${base}/` },
    { name: "Аренда авто в Абхазии", url: `${base}/arenda-avto-abkhazia` },
  ]);
  const faq = buildFaqJsonLd([
    { question: "Можно ли отменить бронь бесплатно?", answer: "Да, бесплатная отмена возможна не позднее чем за 3 суток до начала аренды. Если позже — удерживается оплата за первые сутки." },
    { question: "Есть ли доставка автомобиля?", answer: "Да, возможна доставка на границу/вокзал/аэропорт по договорённости." },
    { question: "Какие документы нужны?", answer: "Для оформления договора нужны паспорт и водительское удостоверение." },
  ]);

  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3.5rem)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: [breadcrumb, faq].map((j) => jsonLdScriptTag(j)).join("\n") }} />

      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", margin: "0 0 var(--space-unit)" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          Главная
        </Link>
        <span style={{ marginInline: "0.35rem" }}>/</span>
        Аренда авто в Абхазии
      </p>

      <h1 style={{ fontSize: "var(--text-3xl)", margin: "0 0 0.75rem" }}>Аренда авто в Абхазии</h1>
      <p style={{ margin: "0 0 1.25rem", fontSize: "var(--text-lg)", color: "var(--color-text-secondary)", maxWidth: "46rem", lineHeight: "var(--leading-relaxed)" }}>
        Подберите автомобиль на нужные даты, оформите бронь онлайн и согласуйте получение. Есть доставка на границу/вокзал/аэропорт и скидки при аренде от 7 суток.
      </p>

      <section aria-labelledby="abkhazia-book" style={{ marginTop: "1rem" }}>
        <h2 id="abkhazia-book" style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.5rem" }}>
          Подбор по датам
        </h2>
        <BookByDatesSection action="/" fromStr={sp.from ?? ""} toStr={sp.to ?? ""} resultsLayout="list" />
      </section>

      <section style={{ marginTop: "calc(var(--space-unit) * 4)" }}>
        <h2 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.5rem" }}>Почему ПальмаАвто</h2>
        <ul style={{ margin: 0, paddingLeft: "1.15rem", color: "var(--color-text-secondary)", lineHeight: "var(--leading-relaxed)", maxWidth: "46rem" }}>
          <li>Скидки при аренде от 7 суток.</li>
          <li>Доставка по договорённости: граница/вокзал/аэропорт.</li>
          <li>Бесплатная отмена за 3 суток до начала аренды.</li>
        </ul>
      </section>

      <section style={{ marginTop: "calc(var(--space-unit) * 4)" }}>
        <h2 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.5rem" }}>Условия и отмена</h2>
        <p style={{ margin: 0, color: "var(--color-text-secondary)", maxWidth: "46rem", lineHeight: "var(--leading-relaxed)" }}>
          Подробности:{" "}
          <Link href="/conditions" className="nav-tap-target" style={{ paddingInline: 0, fontWeight: 600 }}>
            условия аренды
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

