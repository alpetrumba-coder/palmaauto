import type { Metadata } from "next";
import Link from "next/link";

import { LaundryForm } from "@/components/admin/LaundryForm";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";

export const metadata: Metadata = {
  title: "Стирка: распределить — админ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LaundryPage() {
  const me = await requireAdminPanelSession();
  const [accounts, staff] = await Promise.all([
    prisma.cashAccount.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    me.staffId && me.staffId !== "env" ? prisma.staffUser.findUnique({ where: { id: me.staffId }, select: { defaultCashAccountId: true } }) : null,
  ]);
  return (
    <>
      <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)" }}>
        <Link href="/admin-panel/accounting">← К остаткам и журналу</Link>
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.5rem" }}>Стирка: распределить</h1>
      <p style={{ margin: "0 0 1.25rem", maxWidth: "40rem", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
        Сумма за стирку делится поровну между краткосрочными заездами по квартирам, у которых выезд уже был, а стирки ещё нет (выезд за последние 30 дней, не
        раньше даты начала учёта). Сначала покажем список, записываем по кнопке. Перекосы потом можно поправить в журнале. В боте то же самое: «стирка 6000
        распредели».
      </p>
      <LaundryForm accounts={accounts} defaultAccountId={staff?.defaultCashAccountId ?? undefined} />
    </>
  );
}
