import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OperationForm } from "@/components/admin/OperationForm";
import { loadOperationFormOptions } from "@/lib/accounting-options";
import { kopToInput } from "@/lib/money";
import { formatDateInputUTC } from "@/lib/rental-dates";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";

export const metadata: Metadata = {
  title: "Изменить операцию — админ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditOperationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPanelSession();
  const { id } = await params;
  const op = await prisma.operation.findUnique({ where: { id } });
  if (!op || op.voidedAt) notFound();

  const opts = await loadOperationFormOptions({ accountIds: [op.accountId, op.toAccountId], dealId: op.dealId });

  return (
    <>
      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 1rem" }}>Операция №{op.number}</h1>
      <OperationForm
        {...opts}
        operationId={op.id}
        initial={{
          date: formatDateInputUTC(op.date),
          type: op.type,
          amount: kopToInput(op.amountKop),
          accountId: op.accountId,
          toAccountId: op.toAccountId ?? "",
          categoryId: op.categoryId ?? "",
          assetId: op.assetId ?? "",
          dealId: op.dealId ?? "",
          comment: op.comment ?? "",
        }}
        doneHref={op.dealId ? `/admin-panel/accounting/deals/${op.dealId}` : "/admin-panel/accounting"}
      />
    </>
  );
}
