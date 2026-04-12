import Link from "next/link";

import { formatBookingUserLabel } from "@/lib/booking-display";
import { formatDateInputUTC } from "@/lib/rental-dates";
import type { BookingStatus, User } from "@prisma/client";

type CarRow = {
  id: string;
  make: string;
  model: string;
  slug: string;
  active: boolean;
  pricePerDayRub: number;
};

type BookingRow = {
  id: string;
  carId: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  status: BookingStatus;
  user: Pick<User, "email" | "firstName" | "lastName" | "patronymic" | "phone">;
};

type BookingChessboardProps = {
  days: Date[];
  viewStart: Date;
  viewEnd: Date;
  prevFromStr: string;
  nextFromStr: string;
  cars: CarRow[];
  bookings: BookingRow[];
};

const WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

function monthLabelRu(d: Date): string {
  const months = [
    "янв.",
    "февр.",
    "мар.",
    "апр.",
    "мая",
    "июн.",
    "июл.",
    "авг.",
    "сент.",
    "окт.",
    "нояб.",
    "дек.",
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function dayIndexInRange(day: Date, range: Date[]): number {
  const key = formatDateInputUTC(day);
  return range.findIndex((x) => formatDateInputUTC(x) === key);
}

function clipBookingToView(
  bStart: Date,
  bEnd: Date,
  viewStart: Date,
  viewEnd: Date,
): { start: Date; end: Date } | null {
  const s = bStart < viewStart ? viewStart : bStart;
  const e = bEnd > viewEnd ? viewEnd : bEnd;
  if (e < s) return null;
  return { start: s, end: e };
}

function barColor(status: BookingStatus): string {
  if (status === "PAID") return "rgba(90, 140, 90, 0.92)";
  if (status === "PENDING_PAYMENT") return "rgba(220, 140, 120, 0.95)";
  return "rgba(160, 160, 170, 0.85)";
}

function compactRub(p: number): string {
  if (p >= 10_000) return `${Math.round(p / 1000)}k`;
  if (p >= 1000) {
    const k = p / 1000;
    return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
  }
  return String(p);
}

/**
 * Сетка «машины × дни»: в ячейке — цена за сутки; брони — полосы поверх.
 */
export function BookingChessboard({
  days,
  viewStart,
  viewEnd,
  prevFromStr,
  nextFromStr,
  cars,
  bookings,
}: BookingChessboardProps) {
  const n = days.length;

  const monthRow: { label: string; colSpan: number }[] = [];
  let mi = 0;
  while (mi < n) {
    const m = days[mi].getUTCMonth();
    const y = days[mi].getUTCFullYear();
    let span = 1;
    while (mi + span < n && days[mi + span].getUTCMonth() === m && days[mi + span].getUTCFullYear() === y) {
      span += 1;
    }
    monthRow.push({ label: monthLabelRu(days[mi]), colSpan: span });
    mi += span;
  }

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <h1 style={{ fontSize: "var(--text-2xl)", margin: 0, flex: "1 1 auto" }}>Брони и заявки</h1>
        <nav aria-label="Период шахматки" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <Link
            href={`/admin-panel/bookings?from=${encodeURIComponent(prevFromStr)}`}
            className="nav-tap-target"
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              fontSize: "var(--text-sm)",
              textDecoration: "none",
              color: "var(--color-text)",
            }}
          >
            ← Назад
          </Link>
          <Link
            href={`/admin-panel/bookings?from=${encodeURIComponent(nextFromStr)}`}
            className="nav-tap-target"
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              fontSize: "var(--text-sm)",
              textDecoration: "none",
              color: "var(--color-text)",
            }}
          >
            Вперёд →
          </Link>
        </nav>
      </div>

      <p style={{ margin: "0 0 1rem", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
        {formatDateInputUTC(viewStart)} — {formatDateInputUTC(viewEnd)} · оранжевый — ожидает оплаты, зелёный — оплачено.
      </p>

      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: "0.5rem" }}>
        {/* Заголовок месяцев */}
        <div style={{ display: "flex", minWidth: `calc(14rem + ${n} * 2.35rem)` }}>
          <div style={{ width: "14rem", flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex" }}>
            {monthRow.map((cell, idx) => (
              <div
                key={idx}
                style={{
                  flex: cell.colSpan,
                  textAlign: "center",
                  fontWeight: 600,
                  fontSize: "11px",
                  color: "var(--color-text-secondary)",
                  paddingBottom: "0.25rem",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                {cell.label}
              </div>
            ))}
          </div>
        </div>

        {/* Дни недели и числа */}
        <div style={{ display: "flex", minWidth: `calc(14rem + ${n} * 2.35rem)` }}>
          <div
            style={{
              width: "14rem",
              flexShrink: 0,
              borderBottom: "1px solid var(--color-border)",
            }}
          />
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${n}, 1fr)` }}>
            {days.map((d) => {
              const wd = d.getUTCDay();
              const weekend = wd === 0 || wd === 6;
              return (
                <div
                  key={formatDateInputUTC(d) + "wd"}
                  style={{
                    textAlign: "center",
                    fontSize: "10px",
                    color: weekend ? "var(--color-danger, #b00020)" : "var(--color-text-secondary)",
                    padding: "0.15rem 0",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  {WD[wd]}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", minWidth: `calc(14rem + ${n} * 2.35rem)` }}>
          <div
            style={{
              width: "14rem",
              flexShrink: 0,
              borderBottom: "1px solid var(--color-border)",
            }}
          />
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${n}, 1fr)` }}>
            {days.map((d) => (
              <div
                key={formatDateInputUTC(d) + "n"}
                style={{
                  textAlign: "center",
                  fontWeight: 600,
                  fontSize: "11px",
                  paddingBottom: "0.35rem",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                {d.getUTCDate()}
              </div>
            ))}
          </div>
        </div>

        {/* Строки машин */}
        {cars.map((car) => {
          const carBookings = bookings.filter((b) => b.carId === car.id);
          return (
            <div
              key={car.id}
              style={{
                display: "flex",
                minWidth: `calc(14rem + ${n} * 2.35rem)`,
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <div
                style={{
                  width: "14rem",
                  flexShrink: 0,
                  padding: "0.5rem 0.5rem 0.5rem 0",
                  borderRight: "1px solid var(--color-border)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  minHeight: "3.5rem",
                }}
              >
                <span>
                  {car.make} {car.model}
                  {!car.active ? (
                    <span style={{ fontWeight: 400, color: "var(--color-text-secondary)", marginLeft: "0.35rem" }}>
                      (скрыт)
                    </span>
                  ) : null}
                </span>
                <Link
                  href={`/cars/${car.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "10px", fontWeight: 400, color: "var(--color-text-secondary)" }}
                >
                  На сайте
                </Link>
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  position: "relative",
                  display: "grid",
                  gridTemplateColumns: `repeat(${n}, 1fr)`,
                  minHeight: "3.5rem",
                }}
              >
                {days.map((d) => (
                  <div
                    key={car.id + formatDateInputUTC(d)}
                    style={{
                      borderLeft: "1px solid color-mix(in srgb, var(--color-border) 65%, transparent)",
                      padding: "0.15rem",
                      textAlign: "center",
                      color: "var(--color-text-secondary)",
                      fontSize: "9px",
                      lineHeight: 1.2,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <span>{compactRub(car.pricePerDayRub)}</span>
                    <span style={{ opacity: 0.7 }}>₽</span>
                  </div>
                ))}

                {carBookings.map((b) => {
                  const clipped = clipBookingToView(b.startDate, b.endDate, viewStart, viewEnd);
                  if (!clipped) return null;
                  const si = dayIndexInRange(clipped.start, days);
                  const ei = dayIndexInRange(clipped.end, days);
                  if (si < 0 || ei < 0) return null;
                  const span = ei - si + 1;
                  const leftPct = (si / n) * 100;
                  const widthPct = (span / n) * 100;
                  const label = formatBookingUserLabel(b.user);
                  const phone = b.user.phone ? ` · ${b.user.phone}` : "";
                  return (
                    <Link
                      key={b.id}
                      href={`/admin-panel/users/${b.userId}/edit`}
                      title={`${label}${phone}`}
                      style={{
                        position: "absolute",
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        top: "6px",
                        height: "calc(100% - 12px)",
                        minHeight: "26px",
                        background: barColor(b.status),
                        borderRadius: "6px",
                        padding: "2px 5px",
                        overflow: "hidden",
                        textDecoration: "none",
                        color: "#fff",
                        fontSize: "9px",
                        lineHeight: 1.2,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
                        display: "flex",
                        alignItems: "center",
                        zIndex: 2,
                      }}
                    >
                      <span
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {label}
                        {phone}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
