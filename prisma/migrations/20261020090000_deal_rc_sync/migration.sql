-- AlterTable
ALTER TABLE "deals" ADD COLUMN "rc_missing_since" TIMESTAMP(3),
ADD COLUMN "rc_snapshot" JSONB;

-- CreateTable
CREATE TABLE "deal_changes" (
    "id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "deal_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deal_changes_deal_id_at_idx" ON "deal_changes"("deal_id", "at");

-- AddForeignKey
ALTER TABLE "deal_changes" ADD CONSTRAINT "deal_changes_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
