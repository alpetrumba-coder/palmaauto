import type { Metadata } from "next";
import Link from "next/link";

import { DictionaryTable, type DictRow } from "@/components/admin/DictionaryTable";
import { SeedDictionariesButton } from "@/components/admin/SeedDictionariesButton";
import { DICTS, DICT_ORDER, isDictEntity, type DictEntity } from "@/lib/dictionaries";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";

export const metadata: Metadata = {
  title: "Справочники — админ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function loadRows(entity: DictEntity): Promise<DictRow[]> {
  const order = [{ sortOrder: "asc" as const }, { name: "asc" as const }];
  switch (entity) {
    case "projects":
      return (await prisma.project.findMany({ orderBy: order })) as unknown as DictRow[];
    case "assets":
      return (await prisma.asset.findMany({ orderBy: [{ kind: "asc" }, ...order] })) as unknown as DictRow[];
    case "cash":
      return (await prisma.cashAccount.findMany({ orderBy: order })) as unknown as DictRow[];
    case "categories":
      return (await prisma.category.findMany({ orderBy: [{ kind: "asc" }, { nature: "asc" }, ...order] })) as unknown as DictRow[];
    case "channels":
      return (await prisma.channel.findMany({ orderBy: order })) as unknown as DictRow[];
  }
}

export default async function DictionariesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await requireAdminPanelSession();
  const sp = await searchParams;
  const entity: DictEntity = isDictEntity(sp.tab) ? sp.tab : "assets";
  const spec = DICTS[entity];

  const [rows, projectRows, assetsCount] = await Promise.all([
    loadRows(entity),
    prisma.project.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.asset.count(),
  ]);
  const projects = projectRows.map((p) => ({ value: p.id, label: p.name }));

  return (
    <>
      <h1 style={{ fontSize: "var(--text-2xl)", margin: 0 }}>Справочники</h1>
      <nav aria-label="Справочники" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", margin: "0.75rem 0" }}>
        {DICT_ORDER.map((e) => (
          <Link
            key={e}
            href={`/admin-panel/dictionaries?tab=${e}`}
            className="nav-tap-target"
            style={{ fontSize: "var(--text-sm)", fontWeight: e === entity ? 700 : 400, textDecoration: e === entity ? "underline" : "none" }}
          >
            {DICTS[e].title}
          </Link>
        ))}
      </nav>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", maxWidth: "44rem" }}>
        {spec.description}
        {session.role === "OWNER" ? "" : " Изменять справочники может только владелец."}
      </p>
      {session.role === "OWNER" ? <SeedDictionariesButton isEmpty={assetsCount === 0} /> : null}
      <DictionaryTable entity={entity} spec={spec} rows={rows} projects={projects} canEdit={session.role === "OWNER"} />
    </>
  );
}
