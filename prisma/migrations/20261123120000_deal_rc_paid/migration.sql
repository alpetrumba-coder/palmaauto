-- «Оплачено» по RealtyCalendar: отметка предоплаты из RC, обновляется ежедневной сверкой (не деньги в кассах).
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "rc_paid_kop" INTEGER;
