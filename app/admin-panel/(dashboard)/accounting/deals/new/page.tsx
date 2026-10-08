import type { Metadata } from "next";

import { DealForm } from "@/components/admin/DealForm";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";

export const metadata: Metadata = {
  title: "Новый заезд / аренда — админ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewDealPage() {
  await requireAdminPanelSession();
  const [assets, channels] = await Promise.all([
    prisma.asset.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.channel.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  return (
    <>
      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 1rem" }}>Новый заезд / аренда</h1>
      <DealForm
        assets={assets.map((a) => ({ id: a.id, name: a.name, kind: a.kind }))}
        channels={channels.map((c) => ({ id: c.id, name: c.name, lowPct: c.commissionLowPct, highPct: c.commissionHighPct }))}
      />
    </>
  );
}
