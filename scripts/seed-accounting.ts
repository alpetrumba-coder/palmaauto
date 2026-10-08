/**
 * Запуск стартового заполнения справочников из консоли (БД — из DATABASE_URL):
 *   npx tsx scripts/seed-accounting.ts
 * Те же данные заполняются кнопкой в админке: «Справочники» → «Заполнить стартовыми данными».
 */
import { seedAccountingDictionaries } from "../lib/accounting-seed";
import { prisma } from "../lib/prisma";

async function main() {
  const [{ db }] = await prisma.$queryRawUnsafe<{ db: string }[]>("select current_database() db");
  console.log(`База: ${db}`);
  const { created, total } = await seedAccountingDictionaries();
  console.log("Создано:", created);
  console.log("Всего:", total);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
