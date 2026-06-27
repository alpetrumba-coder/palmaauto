import { getActiveCarBySlug } from "@/lib/cars";
import { resolveHomeCarCardSpec, resolveHomeCarPriceFrom } from "@/lib/home-car-card-specs";
import type { HomeCarCardSpec } from "@/lib/home-car-card-specs";
import type { CardPreviewVariant } from "@/components/HomeCarCardVariant";

const FALLBACK_COVER =
  "https://sun9-70.userapi.com/s/v1/ig2/lWmpNzR07nkdfvigVhwG37Yo2C7ClVGuWGW6YfSfHSfZmcIEbHIyMmVdaG2AEVEcr0jw6i8enqgwU2urfZ6BHaxL.jpg?quality=95&cs=1672x0";

export const CARD_PREVIEW_VARIANTS: {
  id: CardPreviewVariant;
  label: string;
  title: string;
  description: string;
}[] = [
  { id: "current", label: "Сейчас", title: "Текущий вариант", description: "Цена и марка в одну линию, залог в цветном блоке." },
  { id: "a", label: "A", title: "Тихий залог", description: "Марка и крупная цена сверху, залог — серая строка внизу." },
  { id: "b", label: "B", title: "Цена на фото", description: "Название и цена поверх фото с градиентом." },
  { id: "c", label: "C", title: "Цена vs залог", description: "Крупная цена слева, мелкий залог справа без фона." },
  { id: "d", label: "D", title: "Залог в сетке", description: "Залог как обычная ячейка среди характеристик." },
];

export function parseCardPreviewVariant(value: string): CardPreviewVariant | null {
  if (value === "current" || value === "a" || value === "b" || value === "c" || value === "d") return value;
  return null;
}

export type CardPreviewData = {
  title: string;
  priceFrom: number;
  coverUrl: string;
  spec: HomeCarCardSpec;
};

export async function getCardPreviewData(): Promise<CardPreviewData> {
  const car = await getActiveCarBySlug("nissan-note");
  const cover = car?.images[0];
  const slug = car?.slug ?? "nissan-note";
  const make = car?.make ?? "Nissan";
  const model = car?.model ?? "Note";

  return {
    title: `${make} ${model}`,
    priceFrom: resolveHomeCarPriceFrom(slug, car?.pricePerDayRub ?? 1599),
    coverUrl: cover?.url ?? FALLBACK_COVER,
    spec: resolveHomeCarCardSpec(slug, {
      modelYear: car?.modelYear ?? 2005,
      color: car?.color ?? "зелёный",
    }),
  };
}
