import Link from "next/link";

import { BookByDatesSection } from "@/components/BookByDatesSection";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, jsonLdScriptTag } from "@/lib/seo-jsonld";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Прокат авто в Сухуме — ПальмаАвто",
  description:
    "Прокат автомобилей в Сухуме (Абхазия): подбор по датам, понятные условия, скидки от 7 суток. ПальмаАвто.",
  alternates: { canonical: "/arenda-avto-sukhum" },
};

export default async function ArendaAvtoSukhumPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const base = "https://palmaauto.ru";
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Главная", url: `${base}/` },
    { name: "Прокат авто в Сухуме", url: `${base}/arenda-avto-sukhum` },
  ]);
  const faq = buildFaqJsonLd([
    { question: "Где получение авто в Сухуме?", answer: "Получение обычно на стоянке/в офисе. Доставка и детали времени согласуются после оформления." },
    { question: "Можно ли отменить бронь бесплатно?", answer: "Да, бесплатная отмена возможна не позднее чем за 3 суток до начала аренды." },
  ]);

  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3.5rem)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: [breadcrumb, faq].map((j) => jsonLdScriptTag(j)).join("\n") }} />

      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", margin: "0 0 var(--space-unit)" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          Главная
        </Link>
        <span style={{ marginInline: "0.35rem" }}>/</span>
        Прокат авто в Сухуме
      </p>

      <h1 style={{ fontSize: "var(--text-3xl)", margin: "0 0 0.75rem" }}>Прокат авто в Сухуме</h1>
      <p style={{ margin: "0 0 1.25rem", fontSize: "var(--text-lg)", color: "var(--color-text-secondary)", maxWidth: "46rem", lineHeight: "var(--leading-relaxed)" }}>
        Ищете аренду автомобиля в Сухуме? Выберите даты, посмотрите доступные машины и оформите бронь онлайн.
      </p>

      <section aria-labelledby="sukhum-book" style={{ marginTop: "1rem" }}>
        <h2 id="sukhum-book" style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.5rem" }}>
          Подбор по датам
        </h2>
        <BookByDatesSection action="/" fromStr={sp.from ?? ""} toStr={sp.to ?? ""} resultsLayout="list" />
      </section>

      <section style={{ marginTop: "calc(var(--space-unit) * 4)" }}>
        <h2 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.5rem" }}>Полезно знать</h2>
        <ul style={{ margin: 0, paddingLeft: "1.15rem", color: "var(--color-text-secondary)", lineHeight: "var(--leading-relaxed)", maxWidth: "46rem" }}>
          <li>Скидки от 7 суток.</li>
          <li>Бесплатная отмена за 3 суток до начала аренды.</li>
          <li>Условия аренды — на странице «Условия».</li>
        </ul>
      </section>
    </div>
  );
}

