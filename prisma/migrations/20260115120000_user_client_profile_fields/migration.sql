-- Профиль клиента для админ-панели и дальнейшего ЛК.
ALTER TABLE "users" ADD COLUMN "last_name" TEXT,
ADD COLUMN "first_name" TEXT,
ADD COLUMN "patronymic" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "passport_data" TEXT;
