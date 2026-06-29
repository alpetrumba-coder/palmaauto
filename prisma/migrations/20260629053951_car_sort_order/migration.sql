-- AlterTable
ALTER TABLE "cars" ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 100;

-- Порядок на главной: Note → Prius → Estima → Crown
UPDATE "cars" SET "sort_order" = 1 WHERE "slug" = 'nissan-note';
UPDATE "cars" SET "sort_order" = 2 WHERE "slug" = 'toyota-prius';
UPDATE "cars" SET "sort_order" = 3 WHERE "slug" = 'toyota-estima';
UPDATE "cars" SET "sort_order" = 4 WHERE "slug" = 'toyota-crown';
