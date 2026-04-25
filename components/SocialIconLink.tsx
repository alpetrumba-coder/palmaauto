import type { CSSProperties, ReactNode } from "react";

export function SocialIconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  const iconStyle: CSSProperties = {
    width: "1.1rem",
    height: "1.1rem",
    display: "block",
  };

  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="nav-tap-target"
      aria-label={label}
      title={label}
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
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.52 3.48A11.78 11.78 0 0 0 12.02 0C5.4 0 0.02 5.38 0.02 12c0 2.1.55 4.14 1.6 5.95L0 24l6.22-1.6a12 12 0 0 0 5.8 1.48h.01c6.62 0 12-5.38 12-12 0-3.2-1.25-6.2-3.51-8.4ZM12.02 21.9h-.01a10 10 0 0 1-5.1-1.4l-.36-.21-3.69.95.99-3.6-.24-.37A9.9 9.9 0 0 1 2.12 12c0-5.46 4.44-9.9 9.9-9.9 2.65 0 5.14 1.03 7 2.9a9.85 9.85 0 0 1 2.9 7c0 5.46-4.44 9.9-9.9 9.9Zm5.76-7.88c-.31-.16-1.82-.9-2.1-1-.28-.1-.49-.16-.7.16-.2.31-.8 1-.98 1.2-.18.2-.36.23-.67.08-.31-.16-1.3-.48-2.48-1.53-.92-.82-1.54-1.83-1.72-2.14-.18-.31-.02-.48.14-.64.14-.14.31-.36.47-.54.16-.18.2-.31.31-.52.1-.2.05-.39-.03-.54-.08-.16-.7-1.68-.96-2.3-.25-.6-.5-.52-.7-.53h-.6c-.2 0-.54.08-.82.39-.28.31-1.07 1.05-1.07 2.56s1.1 2.97 1.25 3.18c.16.2 2.16 3.3 5.24 4.63.73.31 1.3.5 1.75.64.73.23 1.4.2 1.93.12.59-.09 1.82-.74 2.08-1.45.26-.7.26-1.3.18-1.45-.08-.16-.28-.23-.6-.39Z" />
    </svg>
  );
}

export function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.5 1.5 1.2 10.2c-1 .4-1 1.8.1 2.1l5.5 1.7 2.1 6.5c.3.9 1.5 1.2 2.2.6l3.1-2.8 5.6 4.1c.8.6 1.9.1 2.1-.9L23.9 2.8c.2-1-.6-1.7-1.4-1.3ZM8.1 13.1l11.5-7.1c.2-.1.4.2.2.3L10.3 15c-.3.2-.5.6-.5.9l-.2 2.9-1.6-5.2c-.1-.2 0-.4.1-.5Z" />
    </svg>
  );
}

export function MaxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4.5 3.4A1 1 0 0 1 4 18.6V16a2 2 0 0 1-2-2V6Zm4.2 7.4h1.6l1.2-2.3 1.2 2.3h1.6V8.6h-1.4v2.7L11 8.6h-.1l-1.5 2.7V8.6H8.2v4.8Zm7.4 0h1.7l.9-1.4.9 1.4h1.7l-1.7-2.5 1.6-2.3h-1.7l-.8 1.3-.8-1.3h-1.7l1.6 2.3-1.7 2.5Z" />
    </svg>
  );
}

