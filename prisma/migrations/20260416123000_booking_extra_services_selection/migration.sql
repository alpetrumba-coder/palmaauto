-- Выбор доп. услуг на бронировании: второй водитель и детское кресло/бустер

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "second_driver_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "second_driver_first_name" TEXT,
  ADD COLUMN IF NOT EXISTS "second_driver_last_name" TEXT,
  ADD COLUMN IF NOT EXISTS "second_driver_age_years" INTEGER,
  ADD COLUMN IF NOT EXISTS "second_driver_passport_data" TEXT,
  ADD COLUMN IF NOT EXISTS "second_driver_fee_rub" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "child_seat_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "child_seat_fee_rub" INTEGER NOT NULL DEFAULT 0;

