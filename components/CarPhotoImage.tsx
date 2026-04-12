"use client";

import { useState } from "react";

type CarPhotoImageProps = {
  src: string;
  alt: string;
  /** Первое фото на странице машины — без lazy. */
  priority?: boolean;
};

/**
 * Нативный img вместо next/image: стабильная отдача файлов из `public/` (в т.ч. SVG) и внешних URL на Vercel;
 * при 404 или ошибке — заглушка «Фото скоро».
 */
export function CarPhotoImage({ src, alt, priority }: CarPhotoImageProps) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-secondary)",
          fontSize: "var(--text-sm)",
          background: "var(--color-border)",
        }}
      >
        Фото скоро
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- намеренно: надёжный показ /cars/* и SVG без image optimizer
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setBroken(true)}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  );
}
