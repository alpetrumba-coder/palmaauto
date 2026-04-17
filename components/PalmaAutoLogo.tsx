import type { CSSProperties } from "react";

const palmSvgStyle: CSSProperties = {
  display: "inline-block",
  verticalAlign: "-0.16em",
};

export function PalmaAutoLogo({
  size = "var(--text-lg)",
  color = "currentColor",
}: {
  size?: string;
  color?: string;
}) {
  /**
   * Визуально: «ПальмаАв(Т‑пальма)о».
   * Для скринридеров отдаём нормальное слово одним aria-label.
   */
  return (
    <span aria-label="ПальмаАвто" style={{ display: "inline-flex", alignItems: "baseline", gap: "0.02em", color }}>
      <span aria-hidden style={{ fontSize: size, fontWeight: 650, letterSpacing: "-0.01em" }}>
        ПальмаАв
      </span>
      <span aria-hidden style={{ lineHeight: 1, fontSize: size }}>
        <svg
          width="0.98em"
          height="0.98em"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={palmSvgStyle}
        >
          {/* top bar like "Т" */}
          <path
            d="M14 18C14 15.7909 15.7909 14 18 14H46C48.2091 14 50 15.7909 50 18C50 20.2091 48.2091 22 46 22H18C15.7909 22 14 20.2091 14 18Z"
            fill="currentColor"
            opacity="0.95"
          />
          {/* trunk */}
          <path
            d="M30.5 22.5C30.5 20.567 32.067 19 34 19C35.933 19 37.5 20.567 37.5 22.5V53C37.5 55.2091 35.7091 57 33.5 57H32.5C30.2909 57 28.5 55.2091 28.5 53V22.5H30.5Z"
            fill="currentColor"
            opacity="0.95"
          />
          {/* leaves (stylized palm) */}
          <path
            d="M32 12C26.8 12 22.5 14.6 20 18.6C23.6 17.8 27.7 18.7 32 21C36.3 18.7 40.4 17.8 44 18.6C41.5 14.6 37.2 12 32 12Z"
            fill="currentColor"
            opacity="0.9"
          />
          <path
            d="M18.2 20.3C15.3 20.8 13 22.3 11.3 24.5C14.9 25.1 18.1 26.9 21 29.9C22 26.4 21.2 23.3 18.2 20.3Z"
            fill="currentColor"
            opacity="0.78"
          />
          <path
            d="M45.8 20.3C48.7 20.8 51 22.3 52.7 24.5C49.1 25.1 45.9 26.9 43 29.9C42 26.4 42.8 23.3 45.8 20.3Z"
            fill="currentColor"
            opacity="0.78"
          />
        </svg>
      </span>
      <span aria-hidden style={{ fontSize: size, fontWeight: 650, letterSpacing: "-0.01em" }}>
        о
      </span>
    </span>
  );
}

