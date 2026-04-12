-- Удаление значения STAFF из enum UserRole: бывшие сотрудники получают роль ADMIN (доступ к админ-панели).
UPDATE "users" SET "role" = 'ADMIN' WHERE "role" = 'STAFF';

CREATE TYPE "UserRole_new" AS ENUM ('CUSTOMER', 'ADMIN');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER'::"UserRole_new";

DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
