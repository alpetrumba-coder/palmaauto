import { CarCard } from "@/components/CarCard";

/** Тип элемента списка из `getActiveCars()`. */
export type CarCatalogItem = Awaited<ReturnType<typeof import("@/lib/cars").getActiveCars>>[number];

type CarCatalogGridProps = {
  cars: CarCatalogItem[];
};

/**
 * Сетка карточек активных автомобилей (главная, /cars).
 */
export function CarCatalogGrid({ cars }: CarCatalogGridProps) {
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
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
        gap: "clamp(1rem, 3vw, 1.5rem)",
      }}
    >
      {cars.map((car) => {
        const cover = car.images[0];
        return (
          <li key={car.id}>
            <CarCard
              slug={car.slug}
              make={car.make}
              model={car.model}
              pricePerDayRub={car.pricePerDayRub}
              coverUrl={cover?.url ?? null}
              coverAlt={cover?.alt ?? null}
            />
          </li>
        );
      })}
    </ul>
  );
}
