-- Признак тестовых машин и заказов (не учитываются в отчётах).
ALTER TABLE "cars" ADD COLUMN "is_test" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bookings" ADD COLUMN "is_test" BOOLEAN NOT NULL DEFAULT false;

-- Демо-машины из начального сида и все заказы по ним.
UPDATE "cars" SET "is_test" = true
WHERE "slug" IN ('hondafit2007red', 'kia-sportage', 'mercedes-e-class', 'toyota-camry', 'skoda-octavia-hidden');

UPDATE "bookings" SET "is_test" = true
WHERE "car_id" IN (SELECT "id" FROM "cars" WHERE "is_test" = true);
