import { AdminPanelLogoutButton } from "@/components/AdminPanelLogoutButton";
import { AdminPanelNav } from "@/components/admin/AdminPanelNav";
import { PalmaAutoLogo } from "@/components/PalmaAutoLogo";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";
import Link from "next/link";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPanelSession();

  return (
    <div
      className="page-shell"
      style={{ paddingBlock: "clamp(1.5rem, 4vw, 2.5rem)", maxWidth: "min(100%, 118rem)", marginInline: "auto" }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "calc(var(--space-unit) * 2)",
          paddingBottom: "1rem",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Link href="/" className="nav-tap-target" style={{ textDecoration: "none", color: "var(--color-text)" }}>
            <PalmaAutoLogo size="var(--text-xl)" />
          </Link>
          <AdminPanelNav />
        </div>
        <AdminPanelLogoutButton />
      </header>
      {children}
      <footer
        style={{
          marginTop: "calc(var(--space-unit) * 3)",
          paddingTop: "1rem",
          borderTop: "1px solid var(--color-border)",
          color: "var(--color-text-secondary)",
          fontSize: "var(--text-sm)",
          display: "flex",
          gap: "0.5rem 1rem",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <a href="tel:+79407146273" className="nav-tap-target" style={{ paddingInline: 0, color: "inherit", textDecoration: "none", fontWeight: 600 }}>
          +7 940 714-62-73
        </a>
        <span aria-hidden="true">·</span>
        <a href="https://wa.me/79407146273" target="_blank" rel="noreferrer" className="nav-tap-target" style={{ paddingInline: 0, color: "inherit", textDecoration: "none", fontWeight: 600 }}>
          WhatsApp
        </a>
        <span aria-hidden="true">·</span>
        <a href="https://t.me/PalmaAppartmentsAbkhazia" target="_blank" rel="noreferrer" className="nav-tap-target" style={{ paddingInline: 0, color: "inherit", textDecoration: "none", fontWeight: 600 }}>
          Telegram
        </a>
        <span aria-hidden="true">·</span>
        <a href="mailto:palm@tdrubin.com" className="nav-tap-target" style={{ paddingInline: 0, color: "inherit", textDecoration: "none", fontWeight: 600 }}>
          palm@tdrubin.com
        </a>
      </footer>
    </div>
  );
}
