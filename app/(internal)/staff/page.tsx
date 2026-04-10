import Link from "next/link";

/**
 * Заглушка внутренней панели по адресу `/staff`.
 * На этапах 5–6 здесь появятся CRUD автопарка и список бронирований.
 */
export default function StaffHomePage() {
  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 6vw, 3rem)" }}>
      <h1 style={{ fontSize: "var(--text-3xl)", marginTop: 0 }}>Внутренняя зона</h1>
      <p style={{ color: "var(--color-text-secondary)", maxWidth: "40rem" }}>
        Экран для сотрудников проката. Доступ по роли будет настроен вместе с авторизацией.
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
