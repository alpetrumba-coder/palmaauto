import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DealForm } from "@/components/admin/DealForm";
import { kopToInput } from "@/lib/money";
import { formatDateInputUTC } from "@/lib/rental-dates";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";

export const metadata: Metadata = {
  title: "Изменить заезд / аренду — админ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPanelSession();
  const { id } = await params;
  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal || deal.status === "CANCELLED") notFound();

  const [assets, channels] = await Promise.all([
    prisma.asset.findMany({ where: { OR: [{ active: true }, { id: deal.assetId }] }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.channel.findMany({ where: { OR: [{ active: true }, { id: deal.channelId ?? "" }] }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <>
      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 1rem" }}>Заезд / аренда №{deal.number}</h1>
      <DealForm
        dealId={deal.id}
        assets={assets.map((a) => ({ id: a.id, name: a.name, kind: a.kind }))}
        channels={channels.map((c) => ({ id: c.id, name: c.name, lowPct: c.commissionLowPct, highPct: c.commissionHighPct }))}
        initial={{
          assetId: deal.assetId,
          channelId: deal.channelId ?? "",
          guestName: deal.guestName,
          phone: deal.phone ?? "",
          startDate: formatDateInputUTC(deal.startDate),
          endDate: formatDateInputUTC(deal.endDate),
          gross: kopToInput(deal.grossKop),
          commission: kopToInput(deal.commissionKop),
          comment: deal.comment ?? "",
        }}
      />
    </>
  );
}
