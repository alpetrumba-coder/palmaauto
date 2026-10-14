-- Черновики Telegram-бота: "rcdupe" (вопрос про похожую бронь RC) может быть несколько сразу на один чат,
-- поэтому снимаем уникальность чата и различаем вид черновика полем kind. Только добавление/замена индекса.

ALTER TABLE "telegram_drafts" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'expense';

DROP INDEX "telegram_drafts_chat_id_key";
CREATE INDEX "telegram_drafts_chat_id_idx" ON "telegram_drafts"("chat_id");
