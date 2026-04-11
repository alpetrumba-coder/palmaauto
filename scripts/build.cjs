/**
 * Сборка для продакшена: при наличии DATABASE_URL применяем миграции (Vercel и т.д.),
 * затем next build. Без DATABASE_URL миграции пропускаются — удобно для локальной
 * проверки `next build` без поднятой БД; для деплоя с каталогом переменная обязательна.
 */
const { execSync } = require("node:child_process");

const { stripForMigrateDeploy } = require("./prisma-db-url.cjs");

if (process.env.DATABASE_URL) {
  // Миграции: прямое подключение из DIRECT_URL (рекомендует Neon) или та же строка без pgbouncer.
  const migrateUrl = stripForMigrateDeploy(
    process.env.DIRECT_URL || process.env.DATABASE_URL,
  );
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: migrateUrl },
  });
} else {
  console.warn(
    "[build] DATABASE_URL не задан — пропускаем prisma migrate deploy. Для Vercel укажите переменную в настройках проекта.",
  );
}

execSync("npx next build", { stdio: "inherit" });
