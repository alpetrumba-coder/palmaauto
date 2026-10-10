-- Сверка броней с RealtyCalendar: связь заезда с бронью и журнал запусков. Только добавление.
-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "rc_booking_id" INTEGER;

-- CreateTable
CREATE TABLE "rc_sync_runs" (
    "id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "error" TEXT,
    "period_from" DATE,
    "period_to" DATE,
    "result" JSONB,
    "started_by" TEXT,

    CONSTRAINT "rc_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rc_sync_runs_started_at_idx" ON "rc_sync_runs"("started_at");

-- CreateIndex
CREATE UNIQUE INDEX "deals_rc_booking_id_key" ON "deals"("rc_booking_id");

