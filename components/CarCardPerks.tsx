import type { ReactNode } from "react";

const perkIconSize = 32;
const perkIconInner = 26;
const ink = "#1d1d1f";

function PerkIconCircle({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: perkIconSize,
        height: perkIconSize,
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

/** Топливный датчик: E — F, колонка, стрелка на F. */
function FullTankIcon() {
  return (
    <svg viewBox="0 0 24 24" width={perkIconInner} height={perkIconInner} aria-hidden="true">
      <path
        fill="none"
        stroke={ink}
        strokeWidth="1.7"
        strokeLinecap="round"
        d="M4.2 15c0-5.3 4.4-9.6 9.8-9.6s9.8 4.3 9.8 9.6"
      />
      <path
        stroke={ink}
        strokeWidth="1.4"
        strokeLinecap="round"
        d="M6.2 14.4v1.1M8.5 11.5v4M10.8 10.1v5.4M12 9.3v7M13.2 10.1v5.4M15.5 11.5v4M17.8 14.4v1.1"
      />
      <text x="2.4" y="18" fill={ink} fontSize="4.2" fontWeight="800" fontFamily="system-ui, sans-serif">
        E
      </text>
      <text x="17.2" y="18" fill={ink} fontSize="4.2" fontWeight="800" fontFamily="system-ui, sans-serif">
        F
      </text>
      <path
        fill={ink}
        d="M10.6 12.4h2.8c.4 0 .7.3.7.7v3.8c0 .4-.3.7-.7.7h-2.8c-.4 0-.7-.3-.7-.7v-3.8c0-.4.3-.7.7-.7Zm.5-1.8h1.8c.4 0 .7.3.7.7v.7h-3.2v-.7c0-.4.3-.7.7-.7Zm-1 1.8h3.8v1h-3.8v-1Z"
      />
      <path
        fill="none"
        stroke={ink}
        strokeWidth="1.3"
        strokeLinecap="round"
        d="M8.1 15.2h-1.4v-1.2c0-.5.4-.9.9-.9h.5"
      />
      <path stroke={ink} strokeWidth="1.8" strokeLinecap="round" d="M12 15.4 17.4 9.6" />
      <circle cx="12" cy="15.4" r=".95" fill={ink} />
    </svg>
  );
}

/** Автомойка: машина спереди, душ сверху, пена справа. */
function CarWashIcon() {
  return (
    <svg viewBox="0 0 24 24" width={perkIconInner} height={perkIconInner} aria-hidden="true">
      <path
        fill={ink}
        d="M5 15.4h14c.5 0 .9-.4.9-.9l-.7-3.6c-.1-.4-.4-.6-.8-.6h-1.3l-.8-1.7c-.2-.3-.5-.5-.9-.5H8.5c-.4 0-.7.2-.9.5l-.8 1.7H5.6c-.4 0-.7.2-.8.6l-.7 3.6c0 .5.4.9.9.9h.2Z"
      />
      <rect x="8.1" y="12.9" width="2.4" height="1.1" rx=".2" fill="#fff" />
      <rect x="13.5" y="12.9" width="2.4" height="1.1" rx=".2" fill="#fff" />
      <circle cx="7.6" cy="16.1" r="1.1" fill="#fff" stroke={ink} strokeWidth=".6" />
      <circle cx="16.4" cy="16.1" r="1.1" fill="#fff" stroke={ink} strokeWidth=".6" />
      <path fill={ink} d="M9.8 6.2c0-.8.7-1.4 1.5-1.4h1.4c.8 0 1.5.6 1.5 1.4v.6H9.8V6.2Z" />
      <path stroke={ink} strokeWidth="1.1" strokeLinecap="round" d="M10.2 5.1v1.2M12 4.6v2M13.8 5.1v1.2" />
      <circle cx="8.8" cy="5.5" r=".65" fill="none" stroke={ink} strokeWidth="1" />
      <circle cx="15.2" cy="5.5" r=".65" fill="none" stroke={ink} strokeWidth="1" />
      <path
        fill="none"
        stroke={ink}
        strokeWidth="1.1"
        strokeLinejoin="round"
        d="M16.2 10.2c1 .3 1.7 1.1 1.7 2.2s-.7 1.9-1.7 2.2c-.4.7-1.1 1.2-2 1.2-1.2 0-2.1-1-2.1-2.2s.9-2.2 2.1-2.2c.9 0 1.6.5 2 1.2Z"
      />
    </svg>
  );
}

/** Доставка: метка на карте, машина и ключ внутри. */
function DeliveryIcon() {
  return (
    <svg viewBox="0 0 24 24" width={perkIconInner} height={perkIconInner} aria-hidden="true">
      <path
        fill={ink}
        d="M12 2.2c-3.6 0-6.5 2.9-6.5 6.5 0 4.8 6.5 12.3 6.5 12.3s6.5-7.5 6.5-12.3C18.5 5.1 15.6 2.2 12 2.2Z"
      />
      <circle cx="12" cy="8.5" r="4.3" fill="#fff" />
      <path
        fill={ink}
        d="M8.1 9.6c0-1.3 1.1-2.4 2.4-2.4h.3c1.3 0 2.4 1.1 2.4 2.4v1.2H8.1V9.6Zm.7-.3h5.4v.3H8.8v-.3Z"
      />
      <circle cx="9.2" cy="9.9" r=".5" fill="#fff" />
      <circle cx="14.8" cy="9.9" r=".5" fill="#fff" />
      <path fill={ink} d="M15.1 7.5h1.2v3.8h-.6V8.3h-.6V7.5Zm.3 2.5h.5v.6h-.5v-.6Z" />
    </svg>
  );
}

const perks = [
  { label: "Бак полный", Icon: FullTankIcon },
  { label: "Машина помыта", Icon: CarWashIcon },
  { label: "Доставка по Абхазии", Icon: DeliveryIcon },
] as const;

/** Стандартные преимущества аренды под названием авто в карточке. */
export function CarCardPerks() {
  return (
    <ul
      style={{
        listStyle: "none",
        margin: "0.2rem 0 0",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: "0.45rem",
      }}
    >
      {perks.map(({ label, Icon }) => (
        <li
          key={label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            fontSize: "var(--text-xl)",
            color: "var(--color-text-secondary)",
            lineHeight: "var(--leading-relaxed)",
          }}
        >
          <PerkIconCircle>
            <Icon />
          </PerkIconCircle>
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}
