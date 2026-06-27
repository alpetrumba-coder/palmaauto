import Link from "next/link";

import { CarPhotoImage } from "@/components/CarPhotoImage";
import { HomeCarCardSpecs } from "@/components/HomeCarCardSpecs";
import { formatPriceRub } from "@/lib/formatPrice";
import { resolveHomeCarCardSpec, resolveHomeCarPriceFrom, type HomeCarCardSpec } from "@/lib/home-car-card-specs";

type HomeCarCardProps = {
  slug: string;
  make: string;
  model: string;
  pricePerDayRub: number;
  coverUrl: string | null;
  coverAlt: string | null;
  spec: HomeCarCardSpec;
};

export function HomeCarCard({ slug, make, model, pricePerDayRub, coverUrl, coverAlt, spec }: HomeCarCardProps) {
  const title = `${make} ${model}`;
  const priceFrom = resolveHomeCarPriceFrom(slug, pricePerDayRub);

  return (
    <article
      className="car-card home-car-card"
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
            <CarPhotoImage src={coverUrl} alt={coverAlt ?? title} priority={false} />
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

        <div
          style={{
            padding: "clamp(0.85rem, 3vw, 1.1rem)",
            display: "flex",
            flexDirection: "column",
            gap: "0.65rem",
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <p style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--color-accent)", lineHeight: 1.1 }}>
              от {formatPriceRub(priceFrom)}
            </p>
            <h2
              style={{
                margin: 0,
                fontSize: "var(--text-xl)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                textAlign: "right",
              }}
            >
              {title}
            </h2>
          </div>

          <HomeCarCardSpecs spec={spec} />
        </div>
      </Link>
    </article>
  );
}

export function toHomeCarCardProps(car: {
  slug: string;
  make: string;
  model: string;
  pricePerDayRub: number;
  modelYear: number | null;
  color: string | null;
  coverUrl: string | null;
  coverAlt: string | null;
}): HomeCarCardProps {
  const spec = resolveHomeCarCardSpec(car.slug, {
    modelYear: car.modelYear,
    color: car.color,
  });
  return { ...car, spec };
}
