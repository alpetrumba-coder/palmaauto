-- AlterTable
ALTER TABLE "users" ADD COLUMN "birth_year" INTEGER,
ADD COLUMN "passport_series" TEXT,
ADD COLUMN "passport_number" TEXT,
ADD COLUMN "passport_issued_by" TEXT;

-- AlterTable
ALTER TABLE "cars" ADD COLUMN "model_year" INTEGER,
ADD COLUMN "color" TEXT,
ADD COLUMN "plate_number" TEXT,
ADD COLUMN "registration_certificate" TEXT;

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "contract_meta" JSONB;
