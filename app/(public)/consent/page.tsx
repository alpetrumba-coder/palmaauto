import Link from "next/link";

import { LEGAL_DOCS, PERSONAL_DATA_REQUESTS_EMAIL } from "@/lib/legal-docs";

export const dynamic = "force-dynamic";

export default function ConsentPage() {
  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 6vw, 3.5rem)", maxWidth: "52rem" }}>
      <h1 style={{ fontSize: "var(--text-3xl)", margin: "0 0 0.75rem" }}>{LEGAL_DOCS.consent.title}</h1>
      <p style={{ margin: "0 0 1rem", color: "var(--color-text-secondary)" }}>
        Версия: <strong>{LEGAL_DOCS.consent.version}</strong>
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", lineHeight: "var(--leading-relaxed)" }}>
        <p style={{ margin: 0 }}>
          Я подтверждаю, что предоставляю свои персональные данные добровольно и даю согласие оператору{" "}
          <strong>ООО «ПальмаАвто» (Абхазия)</strong> на обработку моих персональных данных для целей оформления и исполнения
          бронирования и договора аренды автомобиля, включая хранение, систематизацию и использование.
        </p>

        <section>
          <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 0.35rem" }}>Перечень данных</h2>
          <ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
            <li>ФИО, телефон, email (если указан).</li>
            <li>Паспортные данные (серия, номер, кем выдан).</li>
            <li>Данные бронирования и выбранных услуг.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 0.35rem" }}>Срок действия согласия</h2>
          <p style={{ margin: 0 }}>
            Согласие действует до достижения целей обработки или до момента его отзыва. Если нет запроса на удаление, данные могут
            храниться до <strong>5 лет</strong> после завершения аренды.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "var(--text-xl)", margin: "0 0 0.35rem" }}>Отзыв согласия и удаление данных</h2>
          <p style={{ margin: 0 }}>
            Для отзыва согласия и удаления/исправления данных напишите на{" "}
            <a href={`mailto:${PERSONAL_DATA_REQUESTS_EMAIL}`} style={{ fontWeight: 600 }}>
              {PERSONAL_DATA_REQUESTS_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>

      <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Link href={LEGAL_DOCS.policy.path} className="nav-tap-target">
          {LEGAL_DOCS.policy.title}
        </Link>
        <Link href={LEGAL_DOCS.conditions.path} className="nav-tap-target">
          {LEGAL_DOCS.conditions.title}
        </Link>
      </div>
    </div>
  );
}

