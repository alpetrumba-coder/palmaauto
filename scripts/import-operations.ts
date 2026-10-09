/**
 * Загрузка нормализованной истории в базу из DATABASE_URL.
 *   npx tsx scripts/import-operations.ts import_ops.json            — добавить недостающее (ничего не перезаписывает)
 *   npx tsx scripts/import-operations.ts import_ops.json --replace  — удалить ранее перенесённое (isImported) и загрузить заново
 * --replace нужен только для тестовой базы: на боевой он стёр бы правки пользователей в перенесённых строках.
 */
import { readFileSync } from "node:fs";

import { importOperations, type ImportOperation } from "../lib/accounting-import";
import { prisma } from "../lib/prisma";

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Укажите файл: npx tsx scripts/import-operations.ts import_ops.json [--replace]");
  const ops = JSON.parse(readFileSync(file, "utf-8")) as ImportOperation[];

  const [{ db }] = await prisma.$queryRawUnsafe<{ db: string }[]>("select current_database() db");
  console.log(`База: ${db}; строк в файле: ${ops.length}`);

  if (process.argv.includes("--replace")) {
    if (db !== "palmaauto_staging") throw new Error(`--replace разрешён только для palmaauto_staging, а база: ${db}`);
    const del = await prisma.operation.deleteMany({ where: { isImported: true } });
    console.log(`Удалено ранее перенесённых: ${del.count}`);
  }

  const res = await importOperations(ops);
  console.log(`Создано: ${res.created}; уже были: ${res.alreadyThere}; всего: ${res.total}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
