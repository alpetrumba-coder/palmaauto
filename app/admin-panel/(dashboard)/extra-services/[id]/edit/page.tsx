import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ExtraServiceForm } from "@/components/admin/ExtraServiceForm";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const s = await prisma.extraService.findUnique({ where: { id } });
  if (!s) return { title: "Не найдено" };
  return {
    title: `Услуга: ${s.name.slice(0, 40)}${s.name.length > 40 ? "…" : ""}`,
    robots: { index: false, follow: false },
  };
}

export default async function AdminEditExtraServicePage({ params }: PageProps) {
  const { id } = await params;
  const s = await prisma.extraService.findUnique({ where: { id } });
  if (!s) {
    notFound();
  }

  const initial = {
    name: s.name,
    pricePerDayRub: s.pricePerDayRub,
    nonDailyPriceText: s.nonDailyPriceText ?? "",
    sortOrder: s.sortOrder,
    active: s.active,
  };

  return (
    <>
      <p style={{ marginBottom: "1rem", fontSize: "var(--text-sm)" }}>
        <Link href="/admin-panel/extra-services">← К списку</Link>
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 0 }}>Редактировать услугу</h1>
      <ExtraServiceForm mode="edit" serviceId={s.id} initial={initial} />
    </>
  );
}
