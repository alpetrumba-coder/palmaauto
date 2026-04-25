import Link from "next/link";

import { LEGAL_DOCS, PERSONAL_DATA_REQUESTS_EMAIL } from "@/lib/legal-docs";

export const dynamic = "force-dynamic";

export default function PolicyPage() {
  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 6vw, 3.5rem)", maxWidth: "52rem" }}>
      <h1 style={{ fontSize: "var(--text-3xl)", margin: "0 0 0.75rem" }}>{LEGAL_DOCS.policy.title}</h1>
      <p style={{ margin: "0 0 1rem", color: "var(--color-text-secondary)" }}>
        Версия: <strong>{LEGAL_DOCS.policy.version}</strong>
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", lineHeight: "var(--leading-relaxed)" }}>
        <section>
          <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 0.35rem" }}>1. Кто мы</h2>
          <p style={{ margin: 0 }}>
            Оператор персональных данных: <strong>ООО «ПальмаАвто» (Абхазия)</strong>. Мы обрабатываем данные для оформления и
            исполнения договора аренды автомобиля, связи с клиентом и безопасности.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 0.35rem" }}>2. Какие данные мы можем обрабатывать</h2>
          <ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
            <li>ФИО, телефон, email (если указан).</li>
            <li>Паспортные данные (серия, номер, кем выдан) — для договора аренды.</li>
            <li>Данные бронирования (даты, выбранный автомобиль, услуги, адреса/время получения и сдачи).</li>
            <li>Технические данные: IP и User-Agent при фиксации согласий и работе сайта.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 0.35rem" }}>3. Цели обработки</h2>
          <ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
            <li>Оформление брони и подготовка договора аренды.</li>
            <li>Связь по вопросам бронирования, получения/сдачи автомобиля.</li>
            <li>Выполнение обязательств по договору и урегулирование споров.</li>
            <li>Отправка маркетинговых сообщений — только при отдельном согласии.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 0.35rem" }}>4. Сроки хранения</h2>
          <p style={{ margin: 0 }}>
            Мы храним персональные данные не дольше, чем это необходимо для целей обработки. Если нет запроса на удаление, срок
            хранения по договору/брони может составлять до <strong>5 лет</strong> после завершения аренды.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 0.35rem" }}>5. Кто имеет доступ</h2>
          <p style={{ margin: 0 }}>
            Доступ к паспортным данным внутри системы ограничен: <strong>только роль ADMIN</strong>.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 0.35rem" }}>6. Передача третьим лицам</h2>
          <p style={{ margin: 0 }}>
            Сейчас мы не передаём персональные данные сторонним сервисам, кроме инфраструктуры хостинга (VPS/БД). При подключении
            внешних сервисов (например, email/SMS) мы обновим эту политику.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 0.35rem" }}>7. Ваши права и обращения</h2>
          <p style={{ margin: 0 }}>
            Вы можете запросить исправление или удаление персональных данных. Напишите на{" "}
            <a href={`mailto:${PERSONAL_DATA_REQUESTS_EMAIL}`} style={{ fontWeight: 600 }}>
              {PERSONAL_DATA_REQUESTS_EMAIL}
            </a>
            . По запросу мы удаляем/обезличиваем данные.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 0.35rem" }}>8. Cookies</h2>
          <p style={{ margin: 0 }}>
            На сайте используются только технические cookies, необходимые для работы авторизации и сессии. Мы не используем
            рекламные трекеры. При внедрении аналитики мы обновим политику.
          </p>
        </section>
      </div>

      <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Link href={LEGAL_DOCS.consent.path} className="nav-tap-target">
          {LEGAL_DOCS.consent.title}
        </Link>
        <Link href={LEGAL_DOCS.conditions.path} className="nav-tap-target">
          {LEGAL_DOCS.conditions.title}
        </Link>
      </div>
    </div>
  );
}

