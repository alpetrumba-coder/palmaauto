-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('PDP', 'MARKETING');

-- AlterTable
ALTER TABLE "extra_services" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "personal_data_erased_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "doc_version" VARCHAR(40) NOT NULL,
    "doc_path" VARCHAR(200) NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" VARCHAR(80),
    "user_agent" TEXT,
    "user_id" TEXT,
    "booking_id" TEXT,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_data_erasures" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "performed_by_id" TEXT,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" VARCHAR(120) NOT NULL,
    "note" TEXT,

    CONSTRAINT "personal_data_erasures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consent_records_user_id_idx" ON "consent_records"("user_id");

-- CreateIndex
CREATE INDEX "consent_records_booking_id_idx" ON "consent_records"("booking_id");

-- CreateIndex
CREATE INDEX "consent_records_type_accepted_at_idx" ON "consent_records"("type", "accepted_at");

-- CreateIndex
CREATE INDEX "personal_data_erasures_user_id_idx" ON "personal_data_erasures"("user_id");

-- CreateIndex
CREATE INDEX "personal_data_erasures_performed_at_idx" ON "personal_data_erasures"("performed_at");

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_data_erasures" ADD CONSTRAINT "personal_data_erasures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_data_erasures" ADD CONSTRAINT "personal_data_erasures_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
