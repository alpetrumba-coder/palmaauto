/** Векторный фирменный знак: пальма, переходящая в дорогу. */
export const PALMA_AUTO_LOGO_SRC = "/logo-palm-road.svg";

export function PalmaAutoLogo({
  size = "var(--text-lg)",
  color = "#29332F",
  showImage = true,
}: {
  size?: string;
  color?: string;
  showImage?: boolean;
}) {
  return (
    <span
      aria-label="Пальма Авто — аренда авто в Абхазии"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.55rem",
        color,
        minWidth: 0,
      }}
    >
      {showImage ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={PALMA_AUTO_LOGO_SRC}
          alt=""
          aria-hidden
          style={{
            height: `calc(${size} * 2.1)`,
            width: "auto",
            maxWidth: `calc(${size} * 2.1)`,
            objectFit: "contain",
            flex: "0 0 auto",
            display: "block",
          }}
        />
      ) : null}
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          flexDirection: "column",
          gap: "0.3em",
          fontSize: size,
          fontWeight: 800,
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
          lineHeight: 1,
        }}
      >
        <span>ПАЛЬМА АВТО</span>
        <span
          style={{
            fontSize: "0.45em",
            fontWeight: 500,
            letterSpacing: "0.025em",
            lineHeight: 1.2,
          }}
        >
          Аренда авто в Абхазии
        </span>
      </span>
    </span>
  );
}
