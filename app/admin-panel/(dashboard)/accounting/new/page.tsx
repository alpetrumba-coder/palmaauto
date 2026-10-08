import type { Metadata } from "next";

import { OperationForm } from "@/components/admin/OperationForm";
import { loadOperationFormOptions } from "@/lib/accounting-options";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";

export const metadata: Metadata = {
  title: "Новая операция — админ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const TITLES = { INCOME: "Приход", EXPENSE: "Расход", TRANSFER: "Перемещение между кассами", HANDOVER: "Сдано в Рубин" } as const;

export default async function NewOperationPage({ searchParams }: { searchParams: Promise<{ type?: string; deal?: string }> }) {
  await requireAdminPanelSession();
  const sp = await searchParams;
  const type = (["INCOME", "EXPENSE", "TRANSFER", "HANDOVER"] as const).find((t) => t === sp.type) ?? "INCOME";
  const opts = await loadOperationFormOptions({ dealId: sp.deal });

  return (
    <>
      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 1rem" }}>Новая операция · {TITLES[type]}</h1>
      <OperationForm
        {...opts}
        defaultType={type}
        presetDealId={sp.deal}
        doneHref={sp.deal ? `/admin-panel/accounting/deals/${sp.deal}` : "/admin-panel/accounting"}
      />
    </>
  );
}
