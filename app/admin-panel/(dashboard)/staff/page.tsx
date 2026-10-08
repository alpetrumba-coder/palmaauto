import type { Metadata } from "next";

import { StaffManager, type StaffRow } from "@/components/admin/StaffManager";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/require-admin-panel";

export const metadata: Metadata = {
  title: "Сотрудники — админ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const me = await requireOwner();
  const staff = await prisma.staffUser.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  const rows: StaffRow[] = staff.map((s) => ({
    id: s.id,
    login: s.login,
    name: s.name,
    role: s.role,
    active: s.active,
    lastLoginAt: s.lastLoginAt ? s.lastLoginAt.toISOString() : null,
  }));

  return (
    <>
      <h1 style={{ fontSize: "var(--text-2xl)", margin: 0 }}>Сотрудники</h1>
      <p style={{ margin: "0.75rem 0 1.25rem", color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", maxWidth: "44rem" }}>
        Личные входы в админ-панель. Пока все сотрудники видят все разделы; справочники и этот раздел — только владелец.
        Общая учётка владельца из настроек сервера продолжает работать.
      </p>
      <StaffManager rows={rows} myId={me.staffId} />
    </>
  );
}
