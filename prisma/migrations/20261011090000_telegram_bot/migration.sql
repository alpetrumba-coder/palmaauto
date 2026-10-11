-- Telegram-бот: привязка сотрудника к чату, касса по умолчанию для команд, черновики операций. Только добавление.

ALTER TABLE "staff_users"
  ADD COLUMN "telegram_chat_id" BIGINT,
  ADD COLUMN "telegram_link_code" TEXT,
  ADD COLUMN "telegram_link_expires" TIMESTAMP(3),
  ADD COLUMN "default_cash_account_id" TEXT;

CREATE UNIQUE INDEX "staff_users_telegram_chat_id_key" ON "staff_users"("telegram_chat_id");
CREATE UNIQUE INDEX "staff_users_telegram_link_code_key" ON "staff_users"("telegram_link_code");

ALTER TABLE "staff_users"
  ADD CONSTRAINT "staff_users_default_cash_account_id_fkey"
  FOREIGN KEY ("default_cash_account_id") REFERENCES "cash_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "telegram_drafts" (
    "id" TEXT NOT NULL,
    "chat_id" BIGINT NOT NULL,
    "input" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "telegram_drafts_chat_id_key" ON "telegram_drafts"("chat_id");
