import { SiteHeader } from "@/components/SiteHeader";

/**
 * Layout внутренней зоны (сотрудники / админ).
 * Позже сюда добавят проверку сессии и роли STAFF | ADMIN.
 * Сейчас маршруты доступны всем — это только визуальный каркас.
 */
export default function InternalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <SiteHeader variant="internal" />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
