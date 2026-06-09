"use client";

import { useId, type CSSProperties, type ReactNode } from "react";

export function SocialIconLink({
  href,
  label,
  children,
  metrikaGoal,
}: {
  href: string;
  label: string;
  children: ReactNode;
  metrikaGoal?: string;
}) {
  const iconStyle: CSSProperties = {
    width: "calc(1.1rem + 1px)",
    height: "calc(1.1rem + 1px)",
    display: "block",
    flexShrink: 0,
  };

  const track = () => {
    if (!metrikaGoal) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ym = (globalThis as any)?.ym as undefined | ((...args: unknown[]) => void);
    if (typeof ym === "function") {
      try {
        ym("reachGoal", metrikaGoal);
      } catch {
        // ignore
      }
    }
  };

  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="nav-tap-target"
      aria-label={label}
      title={label}
      onClick={track}
      style={{
        paddingInline: 0,
        color: "var(--color-text)",
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "44px",
      }}
    >
      <span aria-hidden style={iconStyle}>
        {children}
      </span>
    </a>
  );
}

export function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#25D366" />
      <path
        fill="#fff"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 4.6c-4.09 0-7.4 3.31-7.4 7.4 0 1.3.34 2.56.98 3.68l-1.08 3.82 3.92-1.03a7.37 7.37 0 0 0 3.58.92h.003c4.09 0 7.4-3.31 7.4-7.4S16.09 4.6 12 4.6Zm3.96 10.47c-.17-.09-1.01-.5-1.16-.55-.15-.06-.26-.09-.37.09-.1.18-.41.55-.5.66-.1.11-.19.12-.36.04-.17-.09-.72-.27-1.37-.85-.51-.45-.85-1-.95-1.17-.1-.17 0-.26.07-.35.08-.08.17-.21.26-.31.09-.1.12-.17.17-.28.06-.11.03-.21-.02-.31-.04-.09-.37-.9-.51-1.23-.13-.32-.27-.27-.37-.28-.1 0-.21 0-.31 0-.11 0-.28.04-.43.22-.15.18-.57.56-.57 1.36 0 .81.59 1.59.67 1.7.09.11 1.15 1.76 2.79 2.47 1.09.47 1.53.6 2.06.51.33-.06 1.01-.41 1.15-.81.14-.4.14-.74.1-.81-.04-.08-.15-.12-.32-.21Z"
      />
    </svg>
  );
}

export function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#24A1DE" />
      <path
        fill="#fff"
        d="M5.5 11.8 17.3 7.3c.5-.2 1 .1.8.7l-2 9.4c-.1.5-.4.6-.8.4l-2.2-1.7-1.1 1c-.1.1-.2.2-.5.2l.2-2.8 8.1-7.3c.1-.1 0-.2-.1-.1L8.8 13.8l-2.8-.9c-.6-.2-.6-.6.5-.9Z"
      />
    </svg>
  );
}

export function MaxIcon() {
  const gradId = useId();

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
          <stop stopColor="#007AFF" />
          <stop offset="1" stopColor="#BF5AF2" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5.5" fill={`url(#${gradId})`} />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 7.4a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2Z"
      />
      <path fill="#fff" d="M9.1 16.9 7.8 19.4a.45.45 0 0 0 .55.65l2.2-1.05Z" />
    </svg>
  );
}

