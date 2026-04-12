import { AdminPanelLogoutButton } from "@/components/AdminPanelLogoutButton";
import { AdminPanelNav } from "@/components/admin/AdminPanelNav";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";

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
        <AdminPanelNav />
        <AdminPanelLogoutButton />
      </header>
      {children}
    </div>
  );
}
