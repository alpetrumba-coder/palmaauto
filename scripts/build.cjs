/**
 * Сборка для продакшена: при наличии DATABASE_URL применяем миграции (Vercel и т.д.),
 * затем next build. Без DATABASE_URL миграции пропускаются — удобно для локальной
 * проверки `next build` без поднятой БД; для деплоя с каталогом переменная обязательна.
 */
const { execSync } = require("node:child_process");

if (process.env.DATABASE_URL) {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} else {
  console.warn(
    "[build] DATABASE_URL не задан — пропускаем prisma migrate deploy. Для Vercel укажите переменную в настройках проекта.",
  );
}

execSync("npx next build", { stdio: "inherit" });
