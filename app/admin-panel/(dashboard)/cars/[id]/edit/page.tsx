import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CarForm } from "@/components/admin/CarForm";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const car = await prisma.car.findUnique({ where: { id } });
  if (!car) return { title: "Не найдено" };
  return { title: `Редактировать: ${car.make} ${car.model}`, robots: { index: false, follow: false } };
}

export default async function AdminEditCarPage({ params }: PageProps) {
  const { id } = await params;
  const car = await prisma.car.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });

  if (!car) {
    notFound();
  }

  const initial = {
    slug: car.slug,
    make: car.make,
    model: car.model,
    description: car.description,
    pricePerDayRub: car.pricePerDayRub,
    modelYear: car.modelYear ?? new Date().getFullYear(),
    color: car.color ?? "",
    plateNumber: car.plateNumber ?? "",
    registrationCertificate: car.registrationCertificate ?? "",
    minRentalDays: car.minRentalDays,
    active: car.active,
    images:
      car.images.length > 0
        ? car.images.map((img) => ({ url: img.url, alt: img.alt ?? "" }))
        : [{ url: "", alt: "" }],
  };

  return (
    <>
      <p style={{ marginBottom: "1rem", fontSize: "var(--text-sm)" }}>
        <Link href="/admin-panel/cars">← К списку</Link>
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 0 }}>
        Редактировать: {car.make} {car.model}
      </h1>
      <CarForm mode="edit" carId={car.id} initial={initial} />
    </>
  );
}
