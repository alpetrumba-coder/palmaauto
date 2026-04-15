-- Прейскурант доп. услуг (Приложение №3 к договору аренды)
CREATE TABLE "extra_services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_per_day_rub" INTEGER NOT NULL DEFAULT 0,
    "non_daily_price_text" VARCHAR(200),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extra_services_pkey" PRIMARY KEY ("id")
);

INSERT INTO "extra_services" ("id", "name", "price_per_day_rub", "non_daily_price_text", "sort_order", "active", "created_at", "updated_at") VALUES
('cmextsvc0001deliver', 'Подача или приемка ТС в указанном месте в черте городов Сухум, Гагра, Пицунда, Гудаута, Новый Афон', 0, '500', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cmextsvc0002child', 'Детское кресло / люлька / бустер', 300, NULL, 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cmextsvc0003driver', 'Дополнительный водитель', 500, NULL, 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cmextsvc0004late', 'Возврат ТС в позднее время (с 20 до 8)', 0, '500', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cmextsvc0005fuel', 'Возврат ТС с неполным баком', 0, 'по стоимости топлива + 10%', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
