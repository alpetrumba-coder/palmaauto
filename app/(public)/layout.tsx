import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { YandexMetrika } from "@/components/YandexMetrika";

/**
 * Layout публичной зоны: шапка и подвал для посетителей сайта.
 * Группа маршрутов `(public)` не добавляет сегмент к URL — страницы внутри остаются, например, `/`.
 */
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const metrikaId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {metrikaId ? <YandexMetrika id={metrikaId} /> : null}
      <SiteHeader />
      <main style={{ flex: 1 }}>{children}</main>
      <SiteFooter />
    </div>
  );
}
