import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * Корневой layout всего приложения.
 * Здесь только общее для всех зон: стили, метаданные, <html>/<body>.
 * Отдельные «оболочки» публичной и внутренней части — в группах маршрутов (см. docs/STRUCTURE.md).
 */
export const metadata: Metadata = {
  title: {
    default: "ПальмаАвто — прокат автомобилей",
    template: "%s · ПальмаАвто",
  },
  description: "Прокат автомобилей: каталог, бронирование, личный кабинет (в разработке).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /** Нужно для корректных `env(safe-area-inset-*)` на iPhone с вырезом */
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
