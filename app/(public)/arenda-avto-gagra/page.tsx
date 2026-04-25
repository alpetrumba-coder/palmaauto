import Link from "next/link";

import { BookByDatesSection } from "@/components/BookByDatesSection";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, jsonLdScriptTag } from "@/lib/seo-jsonld";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Прокат авто в Гагре — ПальмаАвто",
  description:
    "Прокат автомобилей в Гагре (Абхазия): подбор по датам, доставка по договорённости, скидки от 7 суток. ПальмаАвто.",
  alternates: { canonical: "/arenda-avto-gagra" },
};

export default async function ArendaAvtoGagraPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const base = "https://palmaauto.ru";
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Главная", url: `${base}/` },
    { name: "Прокат авто в Гагре", url: `${base}/arenda-avto-gagra` },
  ]);
  const faq = buildFaqJsonLd([
    { question: "Можно ли получить авто в Гагре?", answer: "Да, получение/доставка по договорённости. Точное место и время согласуются после оформления брони." },
    { question: "Какая отмена бесплатная?", answer: "Бесплатная отмена возможна не позднее чем за 3 суток до начала аренды." },
  ]);

  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3.5rem)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: [breadcrumb, faq].map((j) => jsonLdScriptTag(j)).join("\n") }} />

      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", margin: "0 0 var(--space-unit)" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          Главная
        </Link>
        <span style={{ marginInline: "0.35rem" }}>/</span>
        Прокат авто в Гагре
      </p>

      <h1 style={{ fontSize: "var(--text-3xl)", margin: "0 0 0.75rem" }}>Прокат авто в Гагре</h1>
      <p style={{ margin: "0 0 1.25rem", fontSize: "var(--text-lg)", color: "var(--color-text-secondary)", maxWidth: "46rem", lineHeight: "var(--leading-relaxed)" }}>
        Подбор авто на нужные даты, прозрачные условия и возможность доставки по договорённости.
      </p>

      <section aria-labelledby="gagra-book" style={{ marginTop: "1rem" }}>
        <h2 id="gagra-book" style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.5rem" }}>
          Подбор по датам
        </h2>
        <BookByDatesSection action="/" fromStr={sp.from ?? ""} toStr={sp.to ?? ""} resultsLayout="list" />
      </section>
    </div>
  );
}

