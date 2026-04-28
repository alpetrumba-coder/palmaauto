import type { ExtraService } from "@prisma/client";

export const OFFICE_ADDRESS = "Республика Абхазия, Сухумский район, с. Дзыгута, ул. Апсильское шоссе, д. 166";

export const DELIVERY_SERVICE_NAME =
  "Подача или приемка ТС в указанном месте в черте городов Сухум, Гагра, Пицунда, Гудаута, Новый Афон";

export const ADDITIONAL_DRIVER_SERVICE_NAME = "Дополнительный водитель";
export const CHILD_SEAT_SERVICE_NAME = "Детское кресло / люлька / бустер";

export function parseDeliveryFeeRub(service: Pick<ExtraService, "pricePerDayRub" | "nonDailyPriceText"> | null): number | null {
  if (!service) return null;
  if (service.pricePerDayRub > 0) return Math.max(0, Math.floor(service.pricePerDayRub));
  const t = (service.nonDailyPriceText ?? "").trim();
  const m = t.match(/\d+/);
  if (!m) return null;
  const n = Number.parseInt(m[0], 10);
  return Number.isFinite(n) ? n : null;
}

export function parsePerDayFeeRub(service: Pick<ExtraService, "pricePerDayRub" | "nonDailyPriceText"> | null): number | null {
  if (!service) return null;
  if (service.pricePerDayRub > 0) return Math.max(0, Math.floor(service.pricePerDayRub));
  const t = (service.nonDailyPriceText ?? "").trim();
  const m = t.match(/\d+/);
  if (!m) return null;
  const n = Number.parseInt(m[0], 10);
  return Number.isFinite(n) ? n : null;
}

