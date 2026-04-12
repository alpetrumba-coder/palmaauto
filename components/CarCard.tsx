import Image from "next/image";
import Link from "next/link";

import { carImageNeedsUnoptimized } from "@/lib/carImageSrc";
import { formatPriceRub } from "@/lib/formatPrice";

type CarCardProps = {
  slug: string;
  make: string;
  model: string;
  pricePerDayRub: number;
  coverUrl: string | null;
  coverAlt: string | null;
};

/**
 * Карточка автомобиля в сетке каталога: обложка, название, цена за сутки.
 */
export function CarCard({ slug, make, model, pricePerDayRub, coverUrl, coverAlt }: CarCardProps) {
  const title = `${make} ${model}`;
  return (
    <article
      className="car-card"
      style={{
        borderRadius: "var(--radius-lg)",
        background: "var(--color-surface)",
        boxShadow: "var(--shadow-soft)",
        border: "1px solid var(--color-border)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
      }}
    >
      <Link
        href={`/cars/${slug}`}
        style={{
          color: "inherit",
          textDecoration: "none",
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        <div
          className="car-card__media"
          style={{
            position: "relative",
            aspectRatio: "16 / 10",
            background: "var(--color-border)",
          }}
        >
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={coverAlt ?? title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw"
              style={{ objectFit: "cover" }}
              priority={false}
              unoptimized={carImageNeedsUnoptimized(coverUrl)}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-text-secondary)",
                fontSize: "var(--text-sm)",
              }}
            >
              Фото скоро
            </div>
          )}
        </div>
        <div style={{ padding: "clamp(1rem, 3vw, 1.25rem)", display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 600, letterSpacing: "-0.02em" }}>{title}</h2>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>за сутки</p>
          <p style={{ margin: "0.25rem 0 0", fontSize: "var(--text-lg)", fontWeight: 600 }}>{formatPriceRub(pricePerDayRub)}</p>
        </div>
      </Link>
    </article>
  );
}
