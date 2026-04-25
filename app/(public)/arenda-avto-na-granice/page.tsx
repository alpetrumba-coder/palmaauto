import Link from "next/link";

import { BookByDatesSection } from "@/components/BookByDatesSection";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, jsonLdScriptTag } from "@/lib/seo-jsonld";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Прокат авто на границе — Абхазия — ПальмаАвто",
  description:
    "Прокат автомобиля с доставкой на границу (Абхазия): подбор по датам, понятные условия, скидки от 7 суток. ПальмаАвто.",
  alternates: { canonical: "/arenda-avto-na-granice" },
};

export default async function ArendaAvtoNaGranicePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const base = "https://palmaauto.ru";
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Главная", url: `${base}/` },
    { name: "Прокат авто на границе", url: `${base}/arenda-avto-na-granice` },
  ]);
  const faq = buildFaqJsonLd([
    { question: "Есть доставка на границу?", answer: "Да, возможна доставка на границу по договорённости. Стоимость и детали согласуются после оформления." },
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
        Прокат авто на границе
      </p>

      <h1 style={{ fontSize: "var(--text-3xl)", margin: "0 0 0.75rem" }}>Прокат авто на границе (Абхазия)</h1>
      <p style={{ margin: "0 0 1.25rem", fontSize: "var(--text-lg)", color: "var(--color-text-secondary)", maxWidth: "46rem", lineHeight: "var(--leading-relaxed)" }}>
        Если вам удобно получить автомобиль на границе — оформите бронь на нужные даты. Доставка возможна по договорённости.
      </p>

      <section aria-labelledby="border-book" style={{ marginTop: "1rem" }}>
        <h2 id="border-book" style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.5rem" }}>
          Подбор по датам
        </h2>
        <BookByDatesSection action="/" fromStr={sp.from ?? ""} toStr={sp.to ?? ""} resultsLayout="list" />
      </section>
    </div>
  );
}

