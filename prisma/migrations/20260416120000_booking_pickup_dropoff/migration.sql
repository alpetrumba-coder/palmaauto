-- Место получения/сдачи автомобиля (офис или адрес) и доплаты к итогу

DO $$ BEGIN
  CREATE TYPE "BookingPlaceMode" AS ENUM ('OFFICE', 'ADDRESS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "pickup_mode" "BookingPlaceMode" NOT NULL DEFAULT 'OFFICE',
  ADD COLUMN IF NOT EXISTS "pickup_address" TEXT,
  ADD COLUMN IF NOT EXISTS "pickup_fee_rub" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "dropoff_mode" "BookingPlaceMode" NOT NULL DEFAULT 'OFFICE',
  ADD COLUMN IF NOT EXISTS "dropoff_address" TEXT,
  ADD COLUMN IF NOT EXISTS "dropoff_fee_rub" INTEGER NOT NULL DEFAULT 0;

