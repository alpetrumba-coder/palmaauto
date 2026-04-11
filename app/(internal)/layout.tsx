import { SiteHeader } from "@/components/SiteHeader";

/**
 * Layout внутренней зоны (сотрудники / админ).
 * Доступ к маршрутам `/staff/*` — middleware (JWT) и роли STAFF | ADMIN.
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
