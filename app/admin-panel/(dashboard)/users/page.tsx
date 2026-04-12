import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Пользователи — админ",
  robots: { index: false, follow: false },
};

const roleLabels: Record<string, string> = {
  CUSTOMER: "Клиент",
  ADMIN: "Администратор",
};

function fullName(u: {
  lastName: string | null;
  firstName: string | null;
  patronymic: string | null;
}): string {
  const parts = [u.lastName, u.firstName, u.patronymic].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "—";
}

export default async function AdminUsersListPage() {
  const users = await prisma.user.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      _count: { select: { bookings: true } },
    },
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", margin: 0 }}>Пользователи (клиенты)</h1>
        <Link
          href="/admin-panel/users/new"
          className="nav-tap-target"
          style={{
            display: "inline-flex",
            padding: "0.6rem 1.1rem",
            borderRadius: "999px",
            background: "var(--color-accent)",
            color: "#fff",
            fontWeight: 600,
            textDecoration: "none",
            fontSize: "var(--text-sm)",
          }}
        >
          Добавить
        </Link>
      </div>

      <p style={{ marginTop: "0.75rem", color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", maxWidth: "40rem" }}>
        Учётные записи сайта: ФИО, контакты и паспортные данные. Новых пользователей можно{" "}
        <Link href="/admin-panel/users/new" style={{ fontWeight: 600 }}>
          добавить вручную
        </Link>{" "}
        или они регистрируются через «Регистрацию» на сайте; здесь же можно уточнить и исправить карточку.
      </p>

      {users.length === 0 ? (
        <p style={{ marginTop: "1.5rem", color: "var(--color-text-secondary)" }}>Пользователей пока нет.</p>
      ) : (
        <div style={{ marginTop: "1.25rem", overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "var(--text-sm)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
            }}
          >
            <thead>
              <tr style={{ background: "var(--color-surface)", textAlign: "left" }}>
                <th style={{ padding: "0.65rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>ФИО</th>
                <th style={{ padding: "0.65rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>Email</th>
                <th style={{ padding: "0.65rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>Телефон</th>
                <th style={{ padding: "0.65rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>Роль</th>
                <th style={{ padding: "0.65rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>Брони</th>
                <th style={{ padding: "0.65rem 0.75rem", borderBottom: "1px solid var(--color-border)" }} />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--color-border)", verticalAlign: "top" }}>
                    {fullName(u)}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--color-border)", wordBreak: "break-word" }}>
                    {u.email}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>{u.phone ?? "—"}</td>
                  <td style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>
                    {roleLabels[u.role] ?? u.role}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>
                    {u._count.bookings}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>
                    <Link href={`/admin-panel/users/${u.id}/edit`} style={{ fontWeight: 600 }}>
                      Редактировать
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
