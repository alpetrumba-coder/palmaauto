-- Договор и профиль: только возраст полных лет, без года рождения
ALTER TABLE "users" DROP COLUMN IF EXISTS "birth_year";
