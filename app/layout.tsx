import type { Metadata, Viewport } from "next";
import "./globals.css";

import { AuthSessionProvider } from "@/components/AuthSessionProvider";

/**
 * Корневой layout всего приложения.
 * Здесь только общее для всех зон: стили, метаданные, <html>/<body>.
 * Отдельные «оболочки» публичной и внутренней части — в группах маршрутов (см. docs/STRUCTURE.md).
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://palmaauto.ru"),
  title: {
    default: "ПальмаАвто — прокат автомобилей",
    template: "%s · ПальмаАвто",
  },
  description: "Прокат автомобилей в Абхазии: каталог, подбор по датам, доставка на границу/вокзал/аэропорт. ПальмаАвто.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://palmaauto.ru/",
    siteName: "ПальмаАвто",
    title: "ПальмаАвто — прокат автомобилей в Абхазии",
    description:
      "Прокат автомобилей в Абхазии: каталог, подбор по датам, доставка на границу/вокзал/аэропорт. Бесплатная отмена за 3 суток.",
    images: [{ url: "/logo.svg", width: 1200, height: 720, alt: "ПальмаАвто" }],
    locale: "ru_RU",
  },
  twitter: {
    card: "summary_large_image",
    title: "ПальмаАвто — прокат автомобилей в Абхазии",
    description:
      "Каталог авто, подбор по датам, доставка на границу/вокзал/аэропорт. Бесплатная отмена за 3 суток.",
    images: ["/logo.svg"],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
  },
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
      <body>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
