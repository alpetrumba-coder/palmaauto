import type { ReactNode } from "react";

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
import { formatPriceRub } from "@/lib/formatPrice";

function SpecCell({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.35rem",
        textAlign: "center",
        minWidth: 0,
      }}
    >
      {icon}
      <span style={{ fontSize: "0.72rem", lineHeight: 1.25, color: "var(--color-text)" }}>{label}</span>
    </div>
  );
}

type HomeCarCardSpecsProps = {
  spec: HomeCarCardSpec;
};

export function HomeCarCardSpecs({ spec }: HomeCarCardSpecsProps) {
  const cells: { key: string; icon: ReactNode; label: string }[] = [];

  if (spec.year > 0) {
    cells.push({ key: "year", icon: <YearIcon />, label: String(spec.year) });
  }

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
    {
      key: "color",
      icon: <ColorIcon hex={spec.color.hex} />,
      label: spec.color.label,
    },
  );

  if (spec.trim) {
    cells.push({ key: "trim", icon: <TrimIcon />, label: spec.trim });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "0.65rem 0.5rem",
        }}
      >
        {cells.map((cell) => (
          <SpecCell key={cell.key} icon={cell.icon} label={cell.label} />
        ))}
      </div>

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
          <p
            style={{
              margin: 0,
              fontSize: "0.65rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--color-text-secondary)",
            }}
          >
            Залог
          </p>
          <p style={{ margin: "0.15rem 0 0", fontSize: "var(--text-base)", fontWeight: 700, color: "var(--color-text)" }}>
            {formatPriceRub(spec.depositRub)}
          </p>
        </div>
      </div>
    </div>
  );
}
