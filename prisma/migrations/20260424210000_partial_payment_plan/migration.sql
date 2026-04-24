-- Add PARTIALLY_PAID booking status and payment plan fields

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';

-- CreateEnum
CREATE TYPE "BookingPaymentPlan" AS ENUM ('FULL', 'FIRST_DAY');

-- AlterTable
ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "payment_plan" "BookingPaymentPlan" NOT NULL DEFAULT 'FULL',
  ADD COLUMN IF NOT EXISTS "paid_amount_rub" INTEGER NOT NULL DEFAULT 0;

-- Backfill
UPDATE "bookings"
SET "paid_amount_rub" = "total_price_rub",
    "payment_plan" = 'FULL'
WHERE "status" = 'PAID';

