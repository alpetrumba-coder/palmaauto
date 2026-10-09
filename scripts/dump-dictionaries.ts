/** Выгрузка справочников учёта в JSON для скрипта нормализации импорта (scripts/import-uk/normalize.py). */
import { writeFileSync } from "node:fs";

import { prisma } from "../lib/prisma";

async function main() {
  const out = process.argv[2] ?? "dictionaries.json";
  const [assets, categories, cash] = await Promise.all([
    prisma.asset.findMany({ select: { id: true, kind: true, name: true, aliases: true, active: true } }),
    prisma.category.findMany({ select: { id: true, name: true, kind: true, nature: true, aliases: true } }),
    prisma.cashAccount.findMany({ select: { id: true, name: true, kind: true, responsible: true } }),
  ]);
  writeFileSync(out, JSON.stringify({ assets, categories, cash }, null, 1), "utf-8");
  console.log(`dictionaries: assets ${assets.length}, categories ${categories.length}, cash ${cash.length} -> ${out}`);
}

main().finally(() => prisma.$disconnect());
