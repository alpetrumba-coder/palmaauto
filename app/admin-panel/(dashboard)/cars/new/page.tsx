import type { Metadata } from "next";
import Link from "next/link";

import { CarForm } from "@/components/admin/CarForm";

export const metadata: Metadata = {
  title: "Новый автомобиль",
  robots: { index: false, follow: false },
};

export default function AdminNewCarPage() {
  return (
    <>
      <p style={{ marginBottom: "1rem", fontSize: "var(--text-sm)" }}>
        <Link href="/admin-panel/cars">← К списку</Link>
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 0 }}>Новый автомобиль</h1>
      <CarForm mode="create" />
    </>
  );
}
