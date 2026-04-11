import Link from "next/link";

import { auth } from "@/auth";

/**
 * Внутренняя панель `/staff` — доступ только STAFF | ADMIN (middleware + сессия).
 */
export default async function StaffHomePage() {
  const session = await auth();

  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 6vw, 3rem)" }}>
      <h1 style={{ fontSize: "var(--text-3xl)", marginTop: 0 }}>Внутренняя зона</h1>
      <p style={{ color: "var(--color-text-secondary)", maxWidth: "40rem" }}>
        Вы вошли как <strong>{session?.user?.email}</strong> (роль: {session?.user?.role}).
      </p>
      <p style={{ color: "var(--color-text-secondary)", maxWidth: "40rem" }}>
        Экран для сотрудников проката. Дальше — CRUD автопарка и бронирования.
      </p>
      <ul style={{ color: "var(--color-text-secondary)", lineHeight: 1.8 }}>
        <li>Управление автопарком и фото — этап 5</li>
        <li>Бронирования и статусы — этап 6</li>
      </ul>
      <p style={{ marginTop: "calc(var(--space-unit) * 3)" }}>
        <Link href="/">← На главную</Link>
      </p>
    </div>
  );
}
