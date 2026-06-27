import { CarCard } from "@/components/CarCard";
import { HomeCarCard, toHomeCarCardProps } from "@/components/HomeCarCard";

/** Тип элемента списка из `getActiveCars()`. */
export type CarCatalogItem = Awaited<ReturnType<typeof import("@/lib/cars").getActiveCars>>[number];

type CarCatalogGridProps = {
  cars: CarCatalogItem[];
  /** Расширенные карточки с характеристиками — только на главной. */
  variant?: "default" | "home";
};

/**
 * Сетка карточек активных автомобилей (главная, /cars).
 */
export function CarCatalogGrid({ cars, variant = "default" }: CarCatalogGridProps) {
  if (cars.length === 0) {
    return (
      <div className="catalog-placeholder" role="status">
        В каталоге пока нет доступных автомобилей. Загляните позже или свяжитесь с нами.
      </div>
    );
  }

  return (
    <ul
      className="car-grid"
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "grid",
        gridTemplateColumns:
          variant === "home"
            ? "repeat(auto-fill, minmax(min(100%, 320px), 1fr))"
            : "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
        gap: "clamp(1rem, 3vw, 1.5rem)",
      }}
    >
      {cars.map((car) => {
        const cover = car.images[0];
        const cardProps = {
          slug: car.slug,
          make: car.make,
          model: car.model,
          pricePerDayRub: car.pricePerDayRub,
          modelYear: car.modelYear,
          color: car.color,
          coverUrl: cover?.url ?? null,
          coverAlt: cover?.alt ?? null,
        };

        return (
          <li key={car.id}>
            {variant === "home" ? (
              <HomeCarCard {...toHomeCarCardProps(cardProps)} />
            ) : (
              <CarCard {...cardProps} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
