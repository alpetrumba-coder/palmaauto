import Link from "next/link";

import { AdminPanelLogoutButton } from "@/components/AdminPanelLogoutButton";
import { AdminPanelNav } from "@/components/admin/AdminPanelNav";
import { PalmaAutoLogo } from "@/components/PalmaAutoLogo";

/**
 * Оболочка страницы в виде RealtyCalendar: серая колонка слева (150 px) с логотипом,
 * серая полоса сверху (60 px) с меню админки, шрифт Ubuntu. Накрывает общий макет админки целиком.
 */
export const RC_FONT = "Ubuntu, Roboto, Arial, sans-serif";
const GRAY = "#f8f9fa";

export function RcShell({ isOwner, userName, children }: { isOwner: boolean; userName: string; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "#fff", color: "#212529", fontFamily: RC_FONT, fontSize: "16px", display: "flex" }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- шрифт нужен только на этой странице, как в RealtyCalendar */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap" precedence="default" />
      <aside style={{ width: 150, flexShrink: 0, background: GRAY, display: "flex", flexDirection: "column" }}>
        <Link href="/admin-panel" style={{ display: "flex", alignItems: "center", height: 60, padding: "0 12px", textDecoration: "none", overflow: "hidden" }}>
          <PalmaAutoLogo size="13px" />
        </Link>
      </aside>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header className="rc-topbar" style={{ height: 60, flexShrink: 0, background: GRAY, display: "flex", alignItems: "center", gap: 16, padding: "0 12px", overflowX: "auto", overflowY: "hidden" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <AdminPanelNav isOwner={isOwner} />
          </div>
          <span style={{ fontSize: 13, color: "#495057", whiteSpace: "nowrap" }}>{userName}</span>
          <AdminPanelLogoutButton />
        </header>
        <main style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{children}</main>
      </div>
      <style>{`.rc-topbar nav { flex-wrap: nowrap !important; gap: 0.9rem !important; } .rc-topbar nav a { white-space: nowrap; font-size: 14px !important; } .rc-topbar nav a:not([style*="border-radius"]) { color: #212529; }`}</style>
    </div>
  );
}
