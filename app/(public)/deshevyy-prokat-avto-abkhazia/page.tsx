import Link from "next/link";

import { BookByDatesSection } from "@/components/BookByDatesSection";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, jsonLdScriptTag } from "@/lib/seo-jsonld";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Дешевый прокат авто в Абхазии — ПальмаАвто",
  description:
    "Дешёвый прокат авто в Абхазии: подбор по датам, прозрачная цена за сутки, скидки от 7 суток. ПальмаАвто.",
  alternates: { canonical: "/deshevyy-prokat-avto-abkhazia" },
};

export default async function DeshevyyProkatAvtoAbkhaziaPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const base = "https://palmaauto.ru";
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Главная", url: `${base}/` },
    { name: "Дешёвый прокат авто в Абхазии", url: `${base}/deshevyy-prokat-avto-abkhazia` },
  ]);
  const faq = buildFaqJsonLd([
    { question: "От чего зависит цена?", answer: "Цена зависит от автомобиля и срока аренды. Длительная аренда может быть выгоднее; скидки — от 7 суток." },
    { question: "Где посмотреть стоимость?", answer: "Цена за сутки указана в каталоге и на карточке автомобиля. Итог — при оформлении брони." },
  ]);

  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3.5rem)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: [breadcrumb, faq].map((j) => jsonLdScriptTag(j)).join("\n") }} />

      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", margin: "0 0 var(--space-unit)" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          Главная
        </Link>
        <span style={{ marginInline: "0.35rem" }}>/</span>
        Дешёвый прокат авто в Абхазии
      </p>

      <h1 style={{ fontSize: "var(--text-3xl)", margin: "0 0 0.75rem" }}>Дешёвый прокат авто в Абхазии</h1>
      <p style={{ margin: "0 0 1.25rem", fontSize: "var(--text-lg)", color: "var(--color-text-secondary)", maxWidth: "46rem", lineHeight: "var(--leading-relaxed)" }}>
        Если ищете недорогой вариант — сравните машины по цене за сутки и выберите даты. Скидки доступны при аренде от 7 суток.
      </p>

      <section aria-labelledby="cheap-book" style={{ marginTop: "1rem" }}>
        <h2 id="cheap-book" style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.5rem" }}>
          Подбор по датам
        </h2>
        <BookByDatesSection action="/" fromStr={sp.from ?? ""} toStr={sp.to ?? ""} resultsLayout="list" />
      </section>

      <section style={{ marginTop: "calc(var(--space-unit) * 4)" }}>
        <h2 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.5rem" }}>Совет</h2>
        <p style={{ margin: 0, color: "var(--color-text-secondary)", maxWidth: "46rem", lineHeight: "var(--leading-relaxed)" }}>
          Чтобы увидеть больше вариантов по бюджету, откройте{" "}
          <Link href="/cars" className="nav-tap-target" style={{ paddingInline: 0, fontWeight: 600 }}>
            каталог автомобилей
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

