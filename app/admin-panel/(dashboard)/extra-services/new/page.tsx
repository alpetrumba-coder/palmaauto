import type { Metadata } from "next";
import Link from "next/link";

import { ExtraServiceForm } from "@/components/admin/ExtraServiceForm";

export const metadata: Metadata = {
  title: "Новая доп. услуга",
  robots: { index: false, follow: false },
};

export default function AdminNewExtraServicePage() {
  return (
    <>
      <p style={{ marginBottom: "1rem", fontSize: "var(--text-sm)" }}>
        <Link href="/admin-panel/extra-services">← К списку</Link>
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)", marginTop: 0 }}>Новая дополнительная услуга</h1>
      <ExtraServiceForm mode="create" />
    </>
  );
}
