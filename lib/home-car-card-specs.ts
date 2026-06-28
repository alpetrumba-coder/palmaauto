export type HomeCarCardSpec = {
  steering: string;
  year: number;
  drive: string;
  transmission: string;
  /** Топливо / тип двигателя. */
  engine?: string;
  /** Кондиционер — отдельная ячейка, может быть вместе с engine. */
  airConditioning?: boolean;
  color: { label: string; hex: string };
  depositRub: number;
  luggage: string;
  trim?: string;
};

const PRICE_FROM_BY_SLUG: Record<string, number> = {
  "nissan-note": 1599,
  "toyota-prius": 1799,
  "toyota-estima": 2999,
  "toyota-crown": 3499,
};

const SPECS_BY_SLUG: Record<string, HomeCarCardSpec> = {
  "nissan-note": {
    steering: "Правый руль",
    year: 2005,
    drive: "Передний",
    transmission: "АКПП",
    engine: "Бензин",
    airConditioning: true,
    color: { label: "Зелёный", hex: "#22c55e" },
    depositRub: 5000,
    luggage: "2–3 чемодана",
  },
  "toyota-prius": {
    steering: "Правый руль",
    year: 2004,
    drive: "Передний",
    transmission: "АКПП",
    engine: "Гибрид",
    airConditioning: true,
    color: { label: "Серебристый", hex: "#c0c0c0" },
    depositRub: 5000,
    luggage: "2–3 чемодана",
  },
  "toyota-estima": {
    steering: "Правый руль",
    year: 2006,
    drive: "Полный",
    transmission: "АКПП",
    engine: "Гибрид",
    airConditioning: true,
    color: { label: "Серебристый", hex: "#c0c0c0" },
    depositRub: 10000,
    luggage: "4–5 чемоданов",
  },
  "toyota-crown": {
    steering: "Правый руль",
    year: 2008,
    drive: "Задний",
    transmission: "АКПП",
    engine: "Бензин",
    airConditioning: true,
    color: { label: "Чёрный", hex: "#1f2937" },
    depositRub: 10000,
    luggage: "2–3 чемодана",
    trim: "Royal Saloon",
  },
};

const COLOR_HEX: Record<string, string> = {
  зелёный: "#22c55e",
  зеленый: "#22c55e",
  красный: "#ef4444",
  серебристый: "#c0c0c0",
  серый: "#9ca3af",
  белый: "#f3f4f6",
  чёрный: "#1f2937",
  черный: "#1f2937",
  синий: "#3b82f6",
};

function colorFromCatalog(color: string | null | undefined): { label: string; hex: string } {
  const label = color?.trim() || "—";
  const hex = COLOR_HEX[label.toLowerCase()] ?? "#c0c0c0";
  const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);
  return { label: displayLabel, hex };
}

function defaultSpec(catalog: { modelYear: number | null; color: string | null }): HomeCarCardSpec {
  return {
    steering: "Правый руль",
    year: catalog.modelYear ?? 0,
    drive: "Передний",
    transmission: "АКПП",
    airConditioning: true,
    color: colorFromCatalog(catalog.color),
    depositRub: 5000,
    luggage: "2–3 чемодана",
  };
}

function mergeCatalog(spec: HomeCarCardSpec, catalog: { modelYear: number | null; color: string | null }): HomeCarCardSpec {
  return {
    ...spec,
    year: catalog.modelYear ?? spec.year,
    color: catalog.color ? colorFromCatalog(catalog.color) : spec.color,
  };
}

/** Характеристики для карточки на главной: по slug каталога, с приоритетом года и цвета из БД. */
export function resolveHomeCarCardSpec(
  slug: string,
  catalog: { modelYear: number | null; color: string | null },
): HomeCarCardSpec {
  const known = SPECS_BY_SLUG[slug];
  if (known) return mergeCatalog(known, catalog);
  return defaultSpec(catalog);
}

/** Цена «от» на карточке главной. */
export function resolveHomeCarPriceFrom(slug: string, catalogPricePerDayRub: number): number {
  return PRICE_FROM_BY_SLUG[slug] ?? catalogPricePerDayRub;
}
