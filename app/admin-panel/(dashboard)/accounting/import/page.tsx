import type { Metadata } from "next";
import Link from "next/link";

import { ImportHistory } from "@/components/admin/ImportHistory";
import { requireOwner } from "@/lib/require-admin-panel";

export const metadata: Metadata = {
  title: "Импорт истории — админ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ImportHistoryPage() {
  await requireOwner();
  return (
    <>
      <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)" }}>
        <Link href="/admin-panel/accounting">← К остаткам и журналу</Link>
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.75rem" }}>Импорт истории</h1>
      <ul style={{ margin: "0 0 1.25rem", paddingLeft: "1.1rem", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", maxWidth: "44rem" }}>
        <li>Перед загрузкой в «Справочниках» должны быть заполнены кассы, статьи и объекты (кнопка «Заполнить стартовыми данными»).</li>
        <li>Перенесённые операции помечаются «импорт» и не меняют остатки касс: остатки вы задаёте вручную.</li>
        <li>Сначала показывается предпросмотр, и только после подтверждения данные записываются. Повторная загрузка того же файла ничего не дублирует.</li>
      </ul>
      <ImportHistory />
    </>
  );
}
