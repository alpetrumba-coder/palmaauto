-- Справочник статей по своду правил учёта (согласовано владельцем 28–29.10.2026).
-- Только данные: переименования (старое название сохраняется в aliases), одна новая статья, отключение неиспользуемых.
-- Операции и история не меняются.

UPDATE "categories" SET "aliases" = TRIM(BOTH E'\n' FROM COALESCE("aliases", '') || E'\n' || "name"), "name" = 'Комиссионные Ева и Дима' WHERE "name" = 'Комиссионные Ева';
UPDATE "categories" SET "aliases" = TRIM(BOTH E'\n' FROM COALESCE("aliases", '') || E'\n' || "name"), "name" = 'Мелкий ремонт' WHERE "name" = 'Ремонт и содержание объектов';
UPDATE "categories" SET "aliases" = TRIM(BOTH E'\n' FROM COALESCE("aliases", '') || E'\n' || "name"), "name" = 'Транспортные расходы (такси)' WHERE "name" = 'Транспортные расходы';
UPDATE "categories" SET "aliases" = TRIM(BOTH E'\n' FROM COALESCE("aliases", '') || E'\n' || "name"), "name" = 'Ремонт служебного автомобиля' WHERE "name" = 'Ремонт и обслуживание транспорта';
UPDATE "categories" SET "aliases" = TRIM(BOTH E'\n' FROM COALESCE("aliases", '') || E'\n' || "name"), "name" = 'Доходы от сдачи недвижимости в аренду посуточно' WHERE "name" = 'Доходы от сдачи имущества в аренду';
UPDATE "categories" SET "aliases" = TRIM(BOTH E'\n' FROM COALESCE("aliases", '') || E'\n' || "name"), "name" = 'Доходы от сдачи недвижимости в аренду долгосрочно' WHERE "name" = 'Оплата за жилье (долгосрочные жильцы)';
UPDATE "categories" SET "aliases" = TRIM(BOTH E'\n' FROM COALESCE("aliases", '') || E'\n' || "name"), "name" = 'Дополнительные доходы' WHERE "name" = 'Транспортные услуги (трансфер)';

INSERT INTO "categories" ("id", "name", "kind", "nature", "sort_order", "active", "binding", "created_at")
SELECT 'cat' || substr(md5(random()::text || clock_timestamp()::text), 1, 22), 'Доходы от сдачи машин в аренду посуточно', 'INCOME', 'VARIABLE',
       COALESCE((SELECT MAX("sort_order") FROM "categories" WHERE "kind" = 'INCOME'), 0) + 1, true, 'deal', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Доходы от сдачи машин в аренду посуточно');

UPDATE "categories" SET "active" = false WHERE "name" IN (
  'Хозяйственные расходы', 'МБП (мелкие бытовые принадлежности)', 'Зарплата Дмитрий', 'Расходы на персонал',
  'Общие расходы', 'Чай, вода, кофе', 'Основные средства'
);
