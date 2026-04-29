import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "О компании",
  description: "Реквизиты и контактные данные ООО «ТДР».",
};

export default function CompanyPage() {
  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3.5rem)" }}>
      <h1 style={{ fontSize: "var(--text-hero)", margin: "0 0 1.25rem" }}>О компании</h1>

      <section
        style={{
          padding: "1.25rem",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          maxWidth: "54rem",
        }}
        aria-labelledby="company-requisites"
      >
        <h2 id="company-requisites" style={{ fontSize: "var(--text-2xl)", margin: "0 0 1rem" }}>
          Реквизиты
        </h2>

        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "minmax(12rem, 18rem) 1fr", gap: "0.65rem 1rem" }}>
          <dt style={{ color: "var(--color-text-secondary)" }}>Наименование</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>ООО «ТДР»</dd>

          <dt style={{ color: "var(--color-text-secondary)" }}>Юридический адрес</dt>
          <dd style={{ margin: 0 }}>
            Республика Абхазия, г. Сухум, ул. Аргун 29а
          </dd>

          <dt style={{ color: "var(--color-text-secondary)" }}>Телефон</dt>
          <dd style={{ margin: 0 }}>
            <a href="tel:+79407146273" className="nav-tap-target" style={{ paddingInline: 0 }}>
              +7 940 714-62-73
            </a>
          </dd>

          <dt style={{ color: "var(--color-text-secondary)" }}>Электронная почта</dt>
          <dd style={{ margin: 0 }}>
            <a href="mailto:palm@tdrubin.com" className="nav-tap-target" style={{ paddingInline: 0 }}>
              palm@tdrubin.com
            </a>
          </dd>

          <dt style={{ color: "var(--color-text-secondary)" }}>ИНН/КПП</dt>
          <dd style={{ margin: 0 }}>11002338 / 411000317</dd>

          <dt style={{ color: "var(--color-text-secondary)" }}>ОКПО</dt>
          <dd style={{ margin: 0 }}>51253091</dd>

          <dt style={{ color: "var(--color-text-secondary)" }}>ОГРН</dt>
          <dd style={{ margin: 0 }}>110 РА000020</dd>
        </dl>

        <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "1.25rem 0" }} />

        <h3 style={{ fontSize: "var(--text-xl)", margin: "0 0 0.75rem" }}>Банковские реквизиты</h3>

        <div style={{ display: "grid", gap: "1rem" }}>
          <div>
            <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>Основной расчётный счёт</p>
            <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "minmax(12rem, 18rem) 1fr", gap: "0.5rem 1rem" }}>
              <dt style={{ color: "var(--color-text-secondary)" }}>Банк</dt>
              <dd style={{ margin: 0 }}>Банк ЦМР Абхазия (ООО)</dd>
              <dt style={{ color: "var(--color-text-secondary)" }}>БИК</dt>
              <dd style={{ margin: 0 }}>224100024</dd>
              <dt style={{ color: "var(--color-text-secondary)" }}>Кор/счёт</dt>
              <dd style={{ margin: 0 }}>30101810200000000024</dd>
              <dt style={{ color: "var(--color-text-secondary)" }}>Расчётный счёт</dt>
              <dd style={{ margin: 0 }}>40702810800000000039</dd>
              <dt style={{ color: "var(--color-text-secondary)" }}>Адрес банка</dt>
              <dd style={{ margin: 0 }}>г. Сухум, ул. Лакоба, д. 31</dd>
            </dl>
          </div>

          <div>
            <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>Вспомогательный расчётный счёт</p>
            <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "minmax(12rem, 18rem) 1fr", gap: "0.5rem 1rem" }}>
              <dt style={{ color: "var(--color-text-secondary)" }}>Банк</dt>
              <dd style={{ margin: 0 }}>КБ «Гарант-Банк», Сухум, Абхазия</dd>
              <dt style={{ color: "var(--color-text-secondary)" }}>БИК</dt>
              <dd style={{ margin: 0 }}>224100002</dd>
              <dt style={{ color: "var(--color-text-secondary)" }}>Кор/счёт</dt>
              <dd style={{ margin: 0 }}>30101810400000000002</dd>
              <dt style={{ color: "var(--color-text-secondary)" }}>Расчётный счёт</dt>
              <dd style={{ margin: 0 }}>40702810500000001310</dd>
              <dt style={{ color: "var(--color-text-secondary)" }}>SWIFT</dt>
              <dd style={{ margin: 0 }}>VTBRRUMM</dd>
              <dt style={{ color: "var(--color-text-secondary)" }}>Адрес</dt>
              <dd style={{ margin: 0 }}>384900, Республика Абхазия, г. Сухум, ул. Пушкина, 21</dd>
            </dl>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "1.25rem 0" }} />

        <h3 style={{ fontSize: "var(--text-xl)", margin: "0 0 0.75rem" }}>Ответственные лица</h3>
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "minmax(12rem, 18rem) 1fr", gap: "0.5rem 1rem" }}>
          <dt style={{ color: "var(--color-text-secondary)" }}>Главный бухгалтер</dt>
          <dd style={{ margin: 0 }}>Алхазова Ольга Константиновна</dd>
          <dt style={{ color: "var(--color-text-secondary)" }}>Генеральный директор</dt>
          <dd style={{ margin: 0 }}>Библая Вячеслав Арвелодович</dd>
        </dl>
      </section>
    </div>
  );
}

