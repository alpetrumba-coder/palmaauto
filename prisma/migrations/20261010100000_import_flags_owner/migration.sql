-- Перенос истории: пометки «импорт» и «проверить» у операций, внешний собственник у объекта.
-- Единственное изменение данных: внешний собственник объекта «Почтовая» — Кошман В. (решение владельца 09.10.2026).
-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "owner_name" TEXT;

-- AlterTable
ALTER TABLE "operations" ADD COLUMN     "is_imported" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needs_review" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "review_note" TEXT,
ADD COLUMN     "source_ref" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "operations_source_ref_key" ON "operations"("source_ref");

-- CreateIndex
CREATE INDEX "operations_needs_review_idx" ON "operations"("needs_review");


-- DataUpdate
UPDATE "assets" SET "owner_name" = 'Кошман В.' WHERE "name" = 'Почтовая' AND "kind" = 'APARTMENT';
