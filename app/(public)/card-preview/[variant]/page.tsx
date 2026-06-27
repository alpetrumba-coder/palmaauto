import Link from "next/link";
import { notFound } from "next/navigation";

import { HomeCarCardVariant } from "@/components/HomeCarCardVariant";
import { CARD_PREVIEW_VARIANTS, getCardPreviewData, parseCardPreviewVariant } from "@/lib/card-preview-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ variant: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { variant: raw } = await params;
  const variant = parseCardPreviewVariant(raw);
  const meta = CARD_PREVIEW_VARIANTS.find((v) => v.id === variant);
  return {
    title: meta ? `Карточка — ${meta.title} · ПальмаАвто` : "Превью карточек",
    robots: { index: false, follow: false },
  };
}

/** Один вариант карточки для превью. */
export default async function CardPreviewVariantPage({ params }: PageProps) {
  const { variant: raw } = await params;
  const variant = parseCardPreviewVariant(raw);
  if (!variant) notFound();

  const meta = CARD_PREVIEW_VARIANTS.find((v) => v.id === variant)!;
  const data = await getCardPreviewData();

  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 4rem)" }}>
      <p style={{ margin: "0 0 1rem" }}>
        <Link href="/card-preview" style={{ color: "var(--color-accent)", fontSize: "var(--text-sm)" }}>
          ← Все варианты
        </Link>
      </p>
      <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-accent)" }}>
        Вариант {meta.label}
      </p>
      <h1 style={{ fontSize: "var(--text-hero)", margin: "0.25rem 0 0.5rem", letterSpacing: "0.02em" }}>{meta.title}</h1>
      <p style={{ margin: "0 0 1.75rem", color: "var(--color-text-secondary)", maxWidth: "36rem", lineHeight: 1.6 }}>{meta.description}</p>
      <div style={{ maxWidth: "360px" }}>
        <HomeCarCardVariant variant={variant} {...data} />
      </div>
    </div>
  );
}
