-- Бронь из админки без карточки пользователя: данные туриста на заказе, user_id необязателен.
ALTER TABLE "bookings" ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "guest_last_name" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "guest_first_name" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "guest_patronymic" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "guest_birth_year" INTEGER;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "guest_passport_series" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "guest_passport_number" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "guest_phone" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "guest_messenger" TEXT;
