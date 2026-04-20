import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Порядок оформления и оплаты",
  description: "Порядок оформления заказа, сроки исполнения, оплата, доставка и возврат.",
};

export default function OrderTermsPage() {
  return (
    <div className="page-shell" style={{ paddingBlock: "clamp(2rem, 8vw, 3.5rem)" }}>
      <h1 style={{ fontSize: "var(--text-hero)", margin: "0 0 1.25rem" }}>
        Порядок оформления и сроки исполнения заказа, оплата, доставка и возврат
      </h1>

      <section
        style={{
          padding: "1.25rem",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          maxWidth: "54rem",
        }}
      >
        <h2 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.75rem" }}>1) Оформление заказа (бронирование)</h2>
        <ul style={{ margin: "0 0 1.25rem", paddingLeft: "1.25rem", lineHeight: "var(--leading-relaxed)" }}>
          <li>
            Вы выбираете автомобиль в <Link href="/cars">каталоге</Link> и указываете даты аренды.
          </li>
          <li>Для оформления брони нужен вход в аккаунт.</li>
          <li>После заполнения данных создаётся бронь. Пересекающиеся брони по датам не допускаются.</li>
        </ul>

        <h2 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.75rem" }}>2) Сроки исполнения</h2>
        <ul style={{ margin: "0 0 1.25rem", paddingLeft: "1.25rem", lineHeight: "var(--leading-relaxed)" }}>
          <li>Срок аренды задаётся выбранными датами (начало и окончание аренды).</li>
          <li>Выдача автомобиля осуществляется в согласованное время в день начала аренды.</li>
          <li>Возврат автомобиля — в согласованное время в день окончания аренды.</li>
        </ul>

        <h2 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.75rem" }}>3) Оплата</h2>
        <ul style={{ margin: "0 0 1.25rem", paddingLeft: "1.25rem", lineHeight: "var(--leading-relaxed)" }}>
          <li>Оплата производится в порядке, указанном при оформлении брони (если доступна онлайн-оплата — через страницу оплаты).</li>
          <li>До подтверждения оплаты бронь может иметь статус «ожидает оплаты».</li>
          <li>Итоговая стоимость зависит от количества дней и выбранных дополнительных услуг (если применимо).</li>
        </ul>

        <h2 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.75rem" }}>4) Доставка (выдача/подгон автомобиля)</h2>
        <ul style={{ margin: "0 0 1.25rem", paddingLeft: "1.25rem", lineHeight: "var(--leading-relaxed)" }}>
          <li>По умолчанию выдача и возврат осуществляются в согласованном месте.</li>
          <li>Если доступна услуга доставки/подачи автомобиля, условия и стоимость указываются при оформлении брони.</li>
        </ul>

        <h2 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.75rem" }}>5) Возврат и отмена</h2>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: "var(--leading-relaxed)" }}>
          <li>
            Отмена брони доступна в личном кабинете <Link href="/account">/account</Link>, если бронь ещё в статусе «ожидает оплаты».
          </li>
          <li>Возврат автомобиля производится по завершении срока аренды по правилам договора аренды.</li>
          <li>
            Если по брони были произведены платежи, порядок возврата денежных средств определяется условиями договора и способом оплаты.
          </li>
        </ul>
      </section>
    </div>
  );
}

