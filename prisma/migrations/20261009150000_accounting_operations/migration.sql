-- Учёт: заезды/аренды и журнал операций; начальный остаток кассы (одна новая колонка). Данные не меняются.
-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER', 'HANDOVER');

-- AlterTable
ALTER TABLE "cash_accounts" ADD COLUMN     "opening_kop" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "asset_id" TEXT NOT NULL,
    "channel_id" TEXT,
    "guest_name" TEXT NOT NULL,
    "phone" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "gross_kop" INTEGER NOT NULL,
    "commission_kop" INTEGER NOT NULL DEFAULT 0,
    "comment" TEXT,
    "status" "DealStatus" NOT NULL DEFAULT 'ACTIVE',
    "site_booking_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "type" "OperationType" NOT NULL,
    "amount_kop" INTEGER NOT NULL,
    "account_id" TEXT NOT NULL,
    "to_account_id" TEXT,
    "category_id" TEXT,
    "asset_id" TEXT,
    "deal_id" TEXT,
    "comment" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided_at" TIMESTAMP(3),
    "voided_by" TEXT,

    CONSTRAINT "operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deals_number_key" ON "deals"("number");

-- CreateIndex
CREATE UNIQUE INDEX "deals_site_booking_id_key" ON "deals"("site_booking_id");

-- CreateIndex
CREATE INDEX "deals_asset_id_start_date_idx" ON "deals"("asset_id", "start_date");

-- CreateIndex
CREATE INDEX "deals_start_date_idx" ON "deals"("start_date");

-- CreateIndex
CREATE UNIQUE INDEX "operations_number_key" ON "operations"("number");

-- CreateIndex
CREATE INDEX "operations_date_idx" ON "operations"("date");

-- CreateIndex
CREATE INDEX "operations_account_id_idx" ON "operations"("account_id");

-- CreateIndex
CREATE INDEX "operations_deal_id_idx" ON "operations"("deal_id");

-- CreateIndex
CREATE INDEX "operations_asset_id_idx" ON "operations"("asset_id");

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "cash_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_to_account_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "cash_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

