import type { ReactNode } from "react";

import { CarPhotoImage } from "@/components/CarPhotoImage";
import {
  AirConditioningIcon,
  ColorIcon,
  DepositIcon,
  DriveIcon,
  EngineIcon,
  LuggageIcon,
  SteeringIcon,
  TransmissionIcon,
  TrimIcon,
  YearIcon,
} from "@/components/CarCardSpecIcons";
import type { HomeCarCardSpec } from "@/lib/home-car-card-specs";
import { CARD_PREVIEW_VARIANTS } from "@/lib/card-preview-data";
import { formatPriceRub } from "@/lib/formatPrice";

export type CardPreviewVariant = "current" | "a" | "b" | "c" | "d";

export type CardPreviewProps = {
  variant: CardPreviewVariant;
  title: string;
  priceFrom: number;
  coverUrl: string;
  spec: HomeCarCardSpec;
};

function SpecCell({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", textAlign: "center", minWidth: 0 }}>
      {icon}
      <span style={{ fontSize: "0.72rem", lineHeight: 1.25, color: "var(--color-text)" }}>{label}</span>
    </div>
  );
}

function buildCells(spec: HomeCarCardSpec, includeDepositInGrid = false) {
  const cells: { key: string; icon: ReactNode; label: string }[] = [];

  if (spec.year > 0) cells.push({ key: "year", icon: <YearIcon />, label: String(spec.year) });
  cells.push({ key: "steering", icon: <SteeringIcon />, label: spec.steering });
  cells.push({ key: "transmission", icon: <TransmissionIcon />, label: spec.transmission });

  if (spec.engine) {
    cells.push({ key: "engine", icon: <EngineIcon />, label: spec.engine });
  }

  if (spec.airConditioning) {
    cells.push({ key: "ac", icon: <AirConditioningIcon />, label: "Кондиционер" });
  }

  cells.push(
    { key: "drive", icon: <DriveIcon />, label: spec.drive },
    { key: "luggage", icon: <LuggageIcon />, label: spec.luggage },
    { key: "color", icon: <ColorIcon hex={spec.color.hex} />, label: spec.color.label },
  );

  if (spec.trim) cells.push({ key: "trim", icon: <TrimIcon />, label: spec.trim });

  if (includeDepositInGrid) {
    cells.push({
      key: "deposit",
      icon: <DepositIcon />,
      label: `Залог ${formatPriceRub(spec.depositRub)}`,
    });
  }

  return cells;
}

function SpecGrid({ spec, includeDepositInGrid = false }: { spec: HomeCarCardSpec; includeDepositInGrid?: boolean }) {
  const cells = buildCells(spec, includeDepositInGrid);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.65rem 0.5rem" }}>
      {cells.map((cell) => (
        <SpecCell key={cell.key} icon={cell.icon} label={cell.label} />
      ))}
    </div>
  );
}

function DepositBanner({ spec }: { spec: HomeCarCardSpec }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.75rem 1rem",
        borderRadius: "var(--radius-md)",
        background: "#fff4ec",
        border: "1px solid #ffd8c2",
      }}
    >
      <DepositIcon />
      <div>
        <p style={{ margin: 0, fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>
          Залог
        </p>
        <p style={{ margin: "0.15rem 0 0", fontSize: "var(--text-base)", fontWeight: 700, color: "var(--color-text)" }}>
          {formatPriceRub(spec.depositRub)}
        </p>
      </div>
    </div>
  );
}

function DepositQuietLine({ spec }: { spec: HomeCarCardSpec }) {
  return (
    <p style={{ margin: "0.15rem 0 0", fontSize: "0.8rem", color: "var(--color-text-secondary)", textAlign: "center" }}>
      Залог {formatPriceRub(spec.depositRub)}
    </p>
  );
}

function cardShell(children: ReactNode) {
  return (
    <article
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
      {children}
    </article>
  );
}

/** Превью вариантов карточки (только /card-preview). */
export function HomeCarCardVariant({ variant, title, priceFrom, coverUrl, spec }: CardPreviewProps) {
  const priceLabel = `от ${formatPriceRub(priceFrom)}`;

  if (variant === "current") {
    return cardShell(
      <>
        <div style={{ position: "relative", aspectRatio: "16 / 10", background: "var(--color-border)" }}>
          <CarPhotoImage src={coverUrl} alt={title} priority={false} />
        </div>
        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.65rem", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--color-accent)", lineHeight: 1.1 }}>{priceLabel}</p>
            <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, textAlign: "right" }}>{title}</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <SpecGrid spec={spec} />
            <DepositBanner spec={spec} />
          </div>
        </div>
      </>,
    );
  }

  if (variant === "a") {
    return cardShell(
      <>
        <div style={{ position: "relative", aspectRatio: "16 / 10", background: "var(--color-border)" }}>
          <CarPhotoImage src={coverUrl} alt={title} priority={false} />
        </div>
        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{title}</h2>
          <p style={{ margin: 0, fontSize: "clamp(1.65rem, 5vw, 2rem)", fontWeight: 800, color: "var(--color-accent)", lineHeight: 1 }}>
            {priceLabel}
            <span style={{ fontSize: "0.95rem", fontWeight: 500, color: "var(--color-text-secondary)", marginLeft: "0.35rem" }}>/ сутки</span>
          </p>
          <div style={{ marginTop: "0.35rem" }}>
            <SpecGrid spec={spec} />
            <DepositQuietLine spec={spec} />
          </div>
        </div>
      </>,
    );
  }

  if (variant === "b") {
    return cardShell(
      <>
        <div style={{ position: "relative", aspectRatio: "16 / 10", background: "var(--color-border)" }}>
          <CarPhotoImage src={coverUrl} alt={title} priority={false} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 45%, transparent 70%)",
            }}
          />
          <div style={{ position: "absolute", left: "1rem", right: "1rem", bottom: "0.85rem", color: "#fff" }}>
            <h2 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, textShadow: "0 1px 8px rgba(0,0,0,0.35)" }}>
              {title}
            </h2>
            <p style={{ margin: "0.35rem 0 0", fontSize: "clamp(1.5rem, 4.5vw, 1.85rem)", fontWeight: 800, color: "#ffb347", lineHeight: 1, textShadow: "0 1px 8px rgba(0,0,0,0.35)" }}>
              {priceLabel}
            </p>
          </div>
        </div>
        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.65rem", flex: 1 }}>
          <SpecGrid spec={spec} />
          <DepositQuietLine spec={spec} />
        </div>
      </>,
    );
  }

  if (variant === "c") {
    return cardShell(
      <>
        <div style={{ position: "relative", aspectRatio: "16 / 10", background: "var(--color-border)" }}>
          <CarPhotoImage src={coverUrl} alt={title} priority={false} />
        </div>
        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.55rem", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "0.75rem" }}>
            <div>
              <p style={{ margin: 0, fontSize: "clamp(1.55rem, 4.5vw, 1.9rem)", fontWeight: 800, color: "var(--color-accent)", lineHeight: 1 }}>{priceLabel}</p>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>за сутки</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Залог</p>
              <p style={{ margin: "0.1rem 0 0", fontSize: "0.95rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>{formatPriceRub(spec.depositRub)}</p>
            </div>
          </div>
          <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</h2>
          <div style={{ marginTop: "0.25rem" }}>
            <SpecGrid spec={spec} />
          </div>
        </div>
      </>,
    );
  }

  // d — залог в сетке
  return cardShell(
    <>
      <div style={{ position: "relative", aspectRatio: "16 / 10", background: "var(--color-border)" }}>
        <CarPhotoImage src={coverUrl} alt={title} priority={false} />
      </div>
      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.65rem", flex: 1 }}>
        <h2 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{title}</h2>
        <p style={{ margin: 0, fontSize: "clamp(1.55rem, 4.5vw, 1.9rem)", fontWeight: 800, color: "var(--color-accent)", lineHeight: 1 }}>
          {priceLabel}
          <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--color-text-secondary)", marginLeft: "0.3rem" }}>/ сутки</span>
        </p>
        <SpecGrid spec={spec} includeDepositInGrid />
      </div>
    </>,
  );
}

export function CardPreviewGallery(props: Omit<CardPreviewProps, "variant">) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      {CARD_PREVIEW_VARIANTS.map((meta) => (
        <section key={meta.id}>
          <div style={{ marginBottom: "1rem" }}>
            <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-accent)" }}>
              Вариант {meta.label}
            </p>
            <h2 style={{ margin: "0.25rem 0 0", fontSize: "var(--text-2xl)", fontWeight: 700 }}>{meta.title}</h2>
            <p style={{ margin: "0.35rem 0 0", color: "var(--color-text-secondary)", maxWidth: "36rem", lineHeight: 1.5 }}>{meta.description}</p>
          </div>
          <div style={{ maxWidth: "360px" }}>
            <HomeCarCardVariant {...props} variant={meta.id} />
          </div>
        </section>
      ))}
    </div>
  );
}
