import Link from "next/link";

import { LEGAL_DOCS } from "@/lib/legal-docs";

export const dynamic = "force-dynamic";

export default function ConditionsPage() {
  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 6vw, 3.5rem)", maxWidth: "56rem" }}>
      <h1 style={{ fontSize: "var(--text-3xl)", margin: "0 0 0.75rem" }}>{LEGAL_DOCS.conditions.title}</h1>
      <p style={{ margin: "0 0 1rem", color: "var(--color-text-secondary)" }}>
        Версия: <strong>{LEGAL_DOCS.conditions.version}</strong>
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.95rem", lineHeight: "var(--leading-relaxed)" }}>
        <section>
          <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 0.35rem" }}>1. Общие положения</h2>
          <p style={{ margin: 0 }}>
            Условия аренды на сайте носят справочный характер. <strong>Договор аренды заключается при подписании</strong> при
            получении автомобиля.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 0.35rem" }}>2. Бронирование</h2>
          <ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
            <li>Бронирование оформляется на выбранные даты и автомобиль.</li>
            <li>Для оформления могут потребоваться ФИО, телефон и паспортные данные для договора.</li>
            <li>Автомобиль считается закреплённым после подтверждения/оплаты в соответствии с выбранным вариантом.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 0.35rem" }}>3. Оплата</h2>
          <p style={{ margin: 0 }}>
            Условия и сумма оплаты зависят от выбранного тарифа и срока аренды. Итоговая сумма отображается при оформлении брони.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 0.35rem" }}>4. Отмена и возврат</h2>
          <p style={{ margin: 0 }}>
            <strong>Бесплатная отмена</strong> возможна, если отмена сделана <strong>не позднее чем за 3 суток</strong> до даты
            начала аренды. Если отмена сделана позже — удерживается <strong>оплата за первые сутки</strong>.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 0.35rem" }}>5. Получение и сдача автомобиля</h2>
          <ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
            <li>Передача/возврат оформляются актом и осмотром автомобиля.</li>
            <li>Доставка на границу/вокзал/аэропорт может быть доступна по договорённости.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 0.35rem" }}>6. Основные ограничения</h2>
          <ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
            <li>Не передавать управление третьим лицам без согласования.</li>
            <li>Не использовать автомобиль в состоянии опьянения.</li>
            <li>Соблюдать ограничения по маршрутам и правилам эксплуатации.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 0.35rem" }}>7. Контакты и документы</h2>
          <p style={{ margin: 0 }}>
            Полный текст согласия на обработку ПДн и политика конфиденциальности доступны по ссылкам ниже.
          </p>
        </section>
      </div>

      <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Link href={LEGAL_DOCS.policy.path} className="nav-tap-target">
          {LEGAL_DOCS.policy.title}
        </Link>
        <Link href={LEGAL_DOCS.consent.path} className="nav-tap-target">
          {LEGAL_DOCS.consent.title}
        </Link>
      </div>
    </div>
  );
}

