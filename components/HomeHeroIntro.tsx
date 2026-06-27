import type { ReactNode } from "react";

import { CancellationPolicyModal } from "@/components/CancellationPolicyModal";
import { CarCardPerks } from "@/components/CarCardPerks";

const iconSize = 32;
const iconInner = 26;
const ink = "#1d1d1f";

function BenefitIconCircle({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: iconSize,
        height: iconSize,
        borderRadius: "50%",
        background: "var(--color-surface)",
        border: `1.5px solid ${ink}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 1px 4px rgba(0, 0, 0, 0.08)",
      }}
    >
      {children}
    </span>
  );
}

function DiscountIcon() {
  return (
    <svg viewBox="0 0 24 24" width={iconInner} height={iconInner} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke={ink} strokeWidth="1.6" />
      <path
        fill="none"
        stroke={ink}
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M8.5 8.5l7 7M15 9a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0ZM9 15a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z"
      />
    </svg>
  );
}

function CancellationIcon() {
  return (
    <svg viewBox="0 0 24 24" width={iconInner} height={iconInner} aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke={ink} strokeWidth="1.5" />
      <path stroke={ink} strokeWidth="1.5" strokeLinecap="round" d="M8 3v4M16 3v4M4 10h16" />
      <path stroke={ink} strokeWidth="1.8" strokeLinecap="round" d="m9 14.5 2 2 4-4" />
    </svg>
  );
}

function BenefitRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        fontSize: "var(--text-xl)",
        color: "var(--color-text-secondary)",
        lineHeight: "var(--leading-relaxed)",
      }}
    >
      <BenefitIconCircle>{icon}</BenefitIconCircle>
      <span>{children}</span>
    </li>
  );
}

/** Блок под заголовком главной: включённые услуги и преимущества сервиса. */
export function HomeHeroIntro() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem", maxWidth: "44rem" }}>
      <CarCardPerks />
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: "0.55rem",
        }}
      >
        <BenefitRow icon={<DiscountIcon />}>От 7 суток — скидки</BenefitRow>
        <BenefitRow icon={<CancellationIcon />}>
          Бесплатная отмена (
          <span style={{ whiteSpace: "nowrap" }}>
            прочитать <CancellationPolicyModal />
          </span>
          )
        </BenefitRow>
      </ul>
    </div>
  );
}
