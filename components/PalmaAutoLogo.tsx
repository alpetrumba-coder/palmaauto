export function PalmaAutoLogo({
  size = "var(--text-lg)",
  color = "currentColor",
  showImage = true,
}: {
  size?: string;
  color?: string;
  showImage?: boolean;
}) {
  return (
    <span
      aria-label="ПАЛЬМААВТО"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        color,
        minWidth: 0,
      }}
    >
      {showImage ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src="/logo.svg"
          alt=""
          aria-hidden
          style={{
            width: `calc(${size} * 1.9)`,
            height: `calc(${size} * 1.2)`,
            objectFit: "contain",
            flex: "0 0 auto",
            display: "block",
          }}
        />
      ) : null}
      <span
        aria-hidden
        style={{
          fontSize: size,
          fontWeight: 800,
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
          lineHeight: 1,
        }}
      >
        ПАЛЬМААВТО
      </span>
    </span>
  );
}

