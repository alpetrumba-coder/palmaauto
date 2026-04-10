-- Первая миграция: минимальная заготовка под пользователей (этап 1 плана).
-- Применение: из корня проекта (`s:\cursor\palmaauto`) выполнить `npx prisma migrate deploy` (или `migrate dev` в разработке).

-- Создаём перечисление ролей (соответствует enum UserRole в schema.prisma).
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'STAFF', 'ADMIN');

-- Таблица users: имя колонок в snake_case через @map в Prisma.
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
