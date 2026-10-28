import type { Metadata } from "next";
import Link from "next/link";

import { AccountingDocTabs } from "@/components/admin/AccountingDocTabs";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";

export const metadata: Metadata = {
  title: "Инструкция по боту — админ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const h2: React.CSSProperties = { fontSize: "var(--text-lg)", margin: "1.6rem 0 0.5rem" };
const list: React.CSSProperties = { margin: 0, paddingLeft: "1.2rem", maxWidth: "46rem", fontSize: "var(--text-sm)", lineHeight: 1.6 };
const say: React.CSSProperties = { fontStyle: "italic", color: "var(--color-text)" };

/** Памятка сотруднику: как вносить расходы, приходы и перемещения голосом через Telegram-бота. */
export default async function BotInstructionPage() {
  await requireAdminPanelSession();
  return (
    <>
      <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)" }}>
        <Link href="/admin-panel/accounting">← К остаткам и журналу</Link>
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.75rem" }}>Как вносить деньги через бота</h1>
      <AccountingDocTabs active="bot" />

      <h2 style={{ ...h2, marginTop: 0 }}>Три шага</h2>
      <ol style={list}>
        <li>
          Нажмите микрофон в чате с ботом и скажите, что случилось, в любом порядке: <span style={say}>«Расход, уборка, Рио, полторы тысячи»</span>,{" "}
          <span style={say}>«Оплата, заезд тридцать четыре, двенадцать тысяч»</span>, <span style={say}>«Сдала пять тысяч в Рубин»</span>. Можно и текстом.
        </li>
        <li>
          Бот пришлёт карточку: ✅ — что понял, ❓ — чего не хватает, и задаст один вопрос. Ответьте коротко голосом или нажмите кнопку:{" "}
          <span style={say}>«34»</span>, <span style={say}>«Иванов»</span>, <span style={say}>«с карты Х»</span>. Фразу целиком повторять не нужно.
        </li>
        <li>
          Когда всё заполнено, проверьте карточку и нажмите <b>«Записать»</b>. Без этой кнопки в учёт ничего не попадает.
        </li>
      </ol>

      <h2 style={h2}>Что обязательно назвать</h2>
      <ul style={list}>
        <li>
          <b>Расход:</b> сумму и за что (статью). К заезду — уборку, стирку, комиссии, банковскую комиссию: назовите номер брони или фамилию гостя. К
          объекту — мелкий ремонт, интернет, коммуналку: назовите квартиру или машину. Общий расход — коротко скажите, на что он.
        </li>
        <li>
          <b>Приход:</b> сумму и заезд (номер брони). Статья подставится сама по брони.
        </li>
        <li>
          <b>Перемещение</b> («сдала», «передал», «перевёл»): сумму и в какую кассу. Из какой — ваша касса, если не сказали другую.
        </li>
        <li>Касса подставляется ваша. Платили с другой — скажите: «с карты Х», «касса Ева», «Амра».</li>
        <li>Дата — сегодня. Если вчера — скажите «вчера».</li>
      </ul>

      <h2 style={h2}>Если ошиблись</h2>
      <ul style={list}>
        <li>
          Скажите исправление: <span style={say}>«не полторы, а тысяча восемьсот»</span>, <span style={say}>«это стирка»</span>,{" "}
          <span style={say}>«заезд тридцать пять»</span> — карточка обновится.
        </li>
        <li>Нажмите «Отмена» или скажите «отмена», чтобы сбросить карточку. Незаконченная карточка сама сбрасывается через 30 минут.</li>
        <li>Уже записали неправильно — скажите владельцу или Еве: операцию аннулируют в журнале (записи не удаляются).</li>
      </ul>

      <h2 style={h2}>Другие команды</h2>
      <ul style={list}>
        <li>«остаток» — остатки ваших касс;</li>
        <li>«статьи» — список статей расходов и к чему они привязываются;</li>
        <li>«помощь» — короткая подсказка.</li>
      </ul>
    </>
  );
}
