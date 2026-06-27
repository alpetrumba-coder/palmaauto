import type { ReactNode } from "react";

const iconSize = 22;
const stroke = "#1d1d1f";

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

export function YearIcon() {
  return (
    <IconBase>
      <rect x="4" y="5" width="16" height="15" rx="2" stroke={stroke} strokeWidth="1.5" />
      <path stroke={stroke} strokeWidth="1.5" d="M8 3v4M16 3v4M4 10h16" />
    </IconBase>
  );
}

export function TransmissionIcon() {
  return (
    <IconBase>
      <path stroke={stroke} strokeWidth="1.5" strokeLinecap="round" d="M6 18V8l4-2v12M14 18V6l4 2v10" />
      <circle cx="6" cy="18" r="1.5" fill={stroke} />
      <circle cx="14" cy="18" r="1.5" fill={stroke} />
    </IconBase>
  );
}

export function EngineIcon() {
  return (
    <IconBase>
      <path
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        d="M5 10h3l1-2h6l1 2h3v6h-3l-1 2h-6l-1-2H5v-6Z"
      />
      <circle cx="9" cy="13" r="1.2" fill={stroke} />
      <circle cx="15" cy="13" r="1.2" fill={stroke} />
    </IconBase>
  );
}

export function DriveIcon() {
  return (
    <IconBase>
      <circle cx="7" cy="17" r="2" stroke={stroke} strokeWidth="1.5" />
      <circle cx="17" cy="17" r="2" stroke={stroke} strokeWidth="1.5" />
      <path stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" d="M5 17h4l2-8h6l2 8" />
    </IconBase>
  );
}

export function LuggageIcon() {
  return (
    <IconBase>
      <rect x="6" y="8" width="12" height="11" rx="1.5" stroke={stroke} strokeWidth="1.5" />
      <path stroke={stroke} strokeWidth="1.5" d="M9 8V6a3 3 0 0 1 6 0v2" />
    </IconBase>
  );
}

export function ColorIcon({ hex }: { hex: string }) {
  return (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7" fill={hex} stroke="#1d1d1f" strokeWidth="1.5" />
    </svg>
  );
}

export function AirConditioningIcon() {
  return (
    <IconBase>
      <path stroke={stroke} strokeWidth="1.5" strokeLinecap="round" d="M12 4v16M6 8l12 8M18 8 6 16" />
      <circle cx="12" cy="12" r="3" stroke={stroke} strokeWidth="1.5" />
    </IconBase>
  );
}

export function TrimIcon() {
  return (
    <IconBase>
      <path stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" d="M5 17h14l-1.5-9H6.5L5 17Z" />
      <path stroke={stroke} strokeWidth="1.5" d="M8 8l1-3h6l1 3" />
    </IconBase>
  );
}

export function SteeringIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="7" stroke={stroke} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2" fill={stroke} />
      <path stroke={stroke} strokeWidth="1.5" strokeLinecap="round" d="M12 5v3M12 16v3M5 12h3M16 12h3" />
    </IconBase>
  );
}

export function DepositIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="#e85d04"
        strokeWidth="1.6"
        strokeLinejoin="round"
        d="M12 3c-3.5 2.5-7 4.2-7 8.5C5 16.5 8 19 12 21c4-2 7-4.5 7-9.5C19 7.2 15.5 5.5 12 3Z"
      />
      <text x="12" y="14" textAnchor="middle" fill="#e85d04" fontSize="8" fontWeight="700" fontFamily="system-ui, sans-serif">
        ₽
      </text>
    </svg>
  );
}
