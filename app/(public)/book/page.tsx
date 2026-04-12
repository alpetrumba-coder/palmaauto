import Link from "next/link";

import { BookByDatesSection } from "@/components/BookByDatesSection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Подобрать авто по датам — ПальмаАвто",
  description: "Выберите даты проката и посмотрите свободные автомобили.",
};

export default async function BookByDatesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const fromStr = (sp.from ?? "").trim();
  const toStr = (sp.to ?? "").trim();

  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3.5rem)" }}>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-unit)" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          Главная
        </Link>
        <span style={{ marginInline: "0.35rem" }}>/</span>
        <span style={{ color: "var(--color-text)" }}>Подбор по датам</span>
      </p>

      <h1 style={{ fontSize: "var(--text-hero)", margin: "0 0 0.75rem" }}>Подобрать автомобиль по датам</h1>
      <p style={{ margin: "0 0 1.5rem", color: "var(--color-text-secondary)", maxWidth: "40rem" }}>
        Укажите даты начала и окончания проката. Покажем только машины, свободные на весь выбранный период (без пересечений с
        оплаченными и ожидающими оплаты бронями).
      </p>

      <BookByDatesSection action="/book" fromStr={fromStr} toStr={toStr} resultsLayout="grid" />
    </div>
  );
}
