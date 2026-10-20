import Link from "next/link";

/**
 * Общая шахматка «объекты × дни» в стиле RealtyCalendar: узкие строки, выходные подкрашены, сегодня выделено.
 * Полоса брони — из середины дня заезда в середину дня выезда (halfDay) или по целым дням (аренда машин).
 */

export type ChessBar = {
  id: string;
  /** Даты YYYY-MM-DD: заезд и выезд (для целодневных — первый и последний день). */
  start: string;
  end: string;
  halfDay: boolean;
  color: string;
  textColor?: string;
  label: string;
  title: string;
  href: string;
  /** Пунктирная рамка: бронь есть только в RealtyCalendar, заезда у нас нет. */
  dashed?: boolean;
};

export type ChessRow = {
  id: string;
  title: string;
  subtitle?: string;
  subtitleHref?: string;
  muted?: boolean;
  /** Мелкий текст в пустой клетке (например, цена за сутки). */
  cell?: string;
  bars: ChessBar[];
};

const WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];

const LABEL_W = "11rem";
const COL_W = 1.75; // rem
const ROW_H = "2rem";
const BORDER = "color-mix(in srgb, var(--color-border) 70%, transparent)";

const dow = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

export function Chessboard({ days, today, rows }: { days: string[]; today: string; rows: ChessRow[] }) {
  const n = days.length;
  const minWidth = `calc(${LABEL_W} + ${n} * ${COL_W}rem)`;

  const months: { label: string; span: number }[] = [];
  for (let i = 0; i < n; ) {
    const ym = days[i].slice(0, 7);
    let span = 1;
    while (i + span < n && days[i + span].slice(0, 7) === ym) span++;
    months.push({ label: `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`, span });
    i += span;
  }

  const cellBg = (iso: string) => {
    if (iso === today) return "color-mix(in srgb, var(--color-accent) 14%, transparent)";
    const w = dow(iso);
    return w === 0 || w === 6 ? "color-mix(in srgb, var(--color-text) 5%, transparent)" : undefined;
  };

  const geometry = (b: ChessBar) => {
    if (b.end < days[0] || b.start > days[n - 1]) return null;
    const si = days.indexOf(b.start);
    const ei = days.indexOf(b.end);
    const off = b.halfDay ? 0.5 : 0;
    const left = b.start < days[0] ? 0 : si + off;
    const right = b.end > days[n - 1] ? n : ei + (b.halfDay ? 0.5 : 1);
    return { left: (left / n) * 100, width: (Math.max(right - left, 0.45) / n) * 100 };
  };

  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: "0.5rem" }}>
      <div style={{ minWidth, fontSize: "11px" }}>
        {/* месяцы */}
        <div style={{ display: "flex" }}>
          <div style={{ width: LABEL_W, flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex" }}>
            {months.map((m, i) => (
              <div key={i} style={{ flex: m.span, textAlign: "center", fontWeight: 600, color: "var(--color-text-secondary)", padding: "0 0 2px", borderLeft: i ? `1px solid ${BORDER}` : undefined }}>
                {m.label}
              </div>
            ))}
          </div>
        </div>
        {/* дни недели и числа */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ width: LABEL_W, flexShrink: 0 }} />
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${n}, 1fr)` }}>
            {days.map((d) => {
              const w = dow(d);
              const weekend = w === 0 || w === 6;
              return (
                <div key={d} style={{ textAlign: "center", lineHeight: 1.15, padding: "1px 0 3px", background: cellBg(d), borderLeft: `1px solid ${BORDER}`, color: weekend ? "var(--color-danger, #b00020)" : "var(--color-text-secondary)", fontWeight: d === today ? 700 : 400 }}>
                  <div style={{ fontSize: "9px" }}>{WD[w]}</div>
                  <div style={{ fontSize: "11px", color: d === today ? "var(--color-accent)" : "var(--color-text)" }}>{Number(d.slice(8, 10))}</div>
                </div>
              );
            })}
          </div>
        </div>

        {rows.length === 0 ? <p style={{ margin: "1rem 0", color: "var(--color-text-secondary)" }}>Нет объектов для показа.</p> : null}
        {rows.map((row) => (
          <div key={row.id} style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ width: LABEL_W, flexShrink: 0, height: ROW_H, display: "flex", flexDirection: "column", justifyContent: "center", paddingRight: "0.4rem", borderRight: "1px solid var(--color-border)", lineHeight: 1.15, overflow: "hidden" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: row.muted ? 0.65 : 1 }} title={row.title}>
                {row.title}
              </span>
              {row.subtitle ? (
                row.subtitleHref ? (
                  <Link href={row.subtitleHref} target="_blank" rel="noopener noreferrer" style={{ fontSize: "9px", color: "var(--color-text-secondary)" }}>
                    {row.subtitle}
                  </Link>
                ) : (
                  <span style={{ fontSize: "9px", color: "var(--color-text-secondary)" }}>{row.subtitle}</span>
                )
              ) : null}
            </div>
            <div style={{ flex: 1, minWidth: 0, position: "relative", height: ROW_H, display: "grid", gridTemplateColumns: `repeat(${n}, 1fr)` }}>
              {days.map((d) => (
                <div key={d} style={{ borderLeft: `1px solid ${BORDER}`, background: cellBg(d), display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)", fontSize: "9px" }}>
                  {row.cell}
                </div>
              ))}
              {row.bars.map((b) => {
                const g = geometry(b);
                if (!g) return null;
                return (
                  <Link
                    key={b.id}
                    href={b.href}
                    title={b.title}
                    style={{
                      position: "absolute",
                      left: `${g.left}%`,
                      width: `${g.width}%`,
                      top: "3px",
                      bottom: "3px",
                      background: b.color,
                      color: b.textColor ?? "#fff",
                      border: b.dashed ? "1.5px dashed color-mix(in srgb, var(--color-text) 45%, transparent)" : undefined,
                      borderRadius: "5px",
                      padding: "0 4px",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      textDecoration: "none",
                      fontSize: "10px",
                      lineHeight: "calc(2rem - 6px)",
                      zIndex: 2,
                    }}
                  >
                    {b.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
