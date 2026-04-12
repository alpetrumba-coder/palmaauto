import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { UserEditForm } from "@/components/admin/UserEditForm";
import { prisma } from "@/lib/prisma";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { title: "Не найдено — админ" };
  return { title: `Пользователь ${user.email} — админ`, robots: { index: false, follow: false } };
}

export default async function AdminUserEditPage({ params }: PageProps) {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    notFound();
  }

  return (
    <>
      <p style={{ margin: "0 0 1rem", fontSize: "var(--text-sm)" }}>
        <Link href="/admin-panel/users" style={{ textDecoration: "none" }}>
          ← Пользователи
        </Link>
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 0 }}>Редактирование пользователя</h1>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginBottom: "1.25rem" }}>
        {user.email}
      </p>
      <UserEditForm
        userId={user.id}
        initial={{
          email: user.email,
          roleLabel: user.role,
          lastName: user.lastName ?? "",
          firstName: user.firstName ?? "",
          patronymic: user.patronymic ?? "",
          phone: user.phone ?? "",
          address: user.address ?? "",
          passportData: user.passportData ?? "",
        }}
      />
    </>
  );
}
