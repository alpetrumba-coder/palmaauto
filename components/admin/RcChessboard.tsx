"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";

import { BarInfoModal, type BarInfo } from "@/components/admin/Chessboard";

/**
 * Шахматка квартир один в один с RealtyCalendar: колонка объектов 215 px, дни по 30 px, строки 28 px,
 * без вертикальной сетки, выходные красным. Полоса брони — по ночам (от дня заезда до дня перед выездом),
 * в начале кружок-буква площадки, снизу полоска оплаты.
 */

export type RcPin = { letter: string; bg: string; color: string; title: string };

export type RcBar = {
  id: string;
  /** Заезд и выезд, YYYY-MM-DD. Полоса закрывает ночи: [start, end). */
  start: string;
  end: string;
  label: string;
  title: string;
  pin: RcPin | null;
  /** Оплачено, доля 0..1. */
  paid: number;
  /** Оплачено полностью — жёлтая, иначе красная (как в RC). */
  paidFull: boolean;
  dashed?: boolean;
  info: BarInfo;
};

/** `group` — раздел шахматки (например «Машины»): перед первой строкой нового раздела — отступ и заголовок. */
export type RcRow = { id: string; title: string; bars: RcBar[]; group?: string; muted?: boolean };

export type RcNavLink = { label: string; href: string; active?: boolean };

const BLUE = "rgb(13, 110, 253)";
const RED_TEXT = "rgb(212, 28, 51)";
const ROW_BORDER = "1px solid rgb(227, 227, 227)";
const NAME_W = 215;
const DAY_W = 30;
const ROW_H = 28;
const WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

const dow = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

export function RcChessboard({
  days,
  today,
  rows,
  nav,
  datePickerFrom,
  tabs,
  actions,
  note,
}: {
  days: string[];
  today: string;
  rows: RcRow[];
  nav: RcNavLink[];
  datePickerFrom: string;
  tabs: RcNavLink[];
  actions: RcNavLink[];
  note?: { text: string; href: string } | null;
}) {
  const [open, setOpen] = useState<BarInfo | null>(null);
  const [q, setQ] = useState("");
  const n = days.length;

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.title.toLowerCase().includes(s) || r.bars.some((b) => b.label.toLowerCase().includes(s) || b.id.toLowerCase().includes(s)));
  }, [q, rows]);

  const months: { label: string; span: number }[] = [];
  for (let i = 0; i < n; ) {
    const ym = days[i].slice(0, 7);
    let span = 1;
    while (i + span < n && days[i + span].slice(0, 7) === ym) span++;
    const m = MONTHS[Number(ym.slice(5, 7)) - 1];
    months.push({ label: ym === today.slice(0, 7) ? m : `${m}, ${ym.slice(0, 4)}`, span });
    i += span;
  }

  const seg = (first: boolean, last: boolean, active?: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    height: 31,
    padding: "0 8px",
    fontSize: 14,
    lineHeight: "21px",
    color: BLUE,
    background: active ? "rgb(231, 241, 255)" : "transparent",
    border: "1px solid rgb(206, 212, 218)",
    marginLeft: first ? 0 : -1,
    borderRadius: first && last ? 6 : first ? "6px 0 0 6px" : last ? "0 6px 6px 0" : 0,
    textDecoration: "none",
    whiteSpace: "nowrap",
  });

  const geometry = (b: RcBar) => {
    if (b.end <= days[0] || b.start > days[n - 1]) return null;
    const si = b.start < days[0] ? 0 : days.indexOf(b.start);
    const ei = b.end > days[n - 1] ? n : days.indexOf(b.end);
    if (si < 0 || ei < 0 || ei <= si) return null;
    return { left: si * DAY_W + 1, width: (ei - si) * DAY_W - 2, clippedLeft: b.start < days[0] };
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "16px 0 0 24px" }}>
      {/* панель над шахматкой */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", paddingRight: 16, marginBottom: 8 }}>
        <div style={{ width: NAME_W - 24, fontSize: 16, fontWeight: 700, lineHeight: "16px", paddingTop: 4 }}>Брони и заявки</div>
        <div style={{ display: "inline-flex", alignItems: "center" }}>
          {nav.map((l, i) => (
            <Link key={l.label} href={l.href} style={seg(i === 0, false, l.active)}>
              {l.label}
            </Link>
          ))}
          <form method="get" action="/admin-panel/bookings" style={{ display: "inline-flex", marginLeft: -1 }}>
            <input type="hidden" name="tab" value="apts" />
            <input
              type="date"
              className="rc-date"
              name="from"
              defaultValue={datePickerFrom}
              aria-label="Показать с даты"
              title="Показать с даты"
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              style={{ ...seg(false, true), width: 36, padding: "0 6px", color: BLUE, fontFamily: "inherit", cursor: "pointer" }}
            />
          </form>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 14, fontSize: 14 }}>
          {tabs.map((t) => (
            <Link key={t.label} href={t.href} style={{ color: BLUE, textDecoration: "none", fontWeight: t.active ? 700 : 400 }}>
              {t.label}
            </Link>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        {note ? (
          <Link href={note.href} style={{ fontSize: 12, color: "rgba(0,0,0,0.6)", textDecoration: "none" }}>
            {note.text}
          </Link>
        ) : null}
        {actions.map((a) => (
          <Link key={a.label} href={a.href} style={{ fontSize: 14, color: BLUE, textDecoration: "none" }}>
            {a.label}
          </Link>
        ))}
      </div>

      {/* шахматка: прокрутка в обе стороны, колонка объектов и шапка дней закреплены */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed", width: NAME_W + n * DAY_W }}>
          <colgroup>
            <col style={{ width: NAME_W }} />
            {days.map((d) => (
              <col key={d} style={{ width: DAY_W }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={2} style={{ position: "sticky", left: 0, top: 0, zIndex: 4, background: "#fff", verticalAlign: "bottom", padding: "0 8px 4px 0", textAlign: "left" }}>
                <div style={{ display: "flex" }}>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Поиск по ID, названию, адр"
                    style={{ flex: 1, minWidth: 0, height: 31, fontSize: 14, fontFamily: "inherit", padding: "0 8px", border: "1px solid rgb(222, 226, 230)", borderRadius: "4px 0 0 4px", outline: "none" }}
                  />
                  <span aria-hidden="true" style={{ width: 31, height: 31, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid rgb(222, 226, 230)", borderLeft: 0, borderRadius: "0 4px 4px 0", color: "#212529" }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
                    </svg>
                  </span>
                </div>
              </th>
              {months.map((m, i) => (
                <th key={i} colSpan={m.span} style={{ position: "sticky", top: 0, zIndex: 3, background: "#fff", textAlign: "left", fontSize: 10, lineHeight: "16px", fontWeight: 400, color: "rgba(0,0,0,0.6)", padding: "0 0 0 4px", height: 16, whiteSpace: "nowrap", borderLeft: i ? "1px solid rgb(227, 227, 227)" : undefined }}>
                  {m.label}
                </th>
              ))}
            </tr>
            <tr>
              {days.map((d) => {
                const w = dow(d);
                const weekend = w === 0 || w === 6;
                const isToday = d === today;
                return (
                  <th key={d} style={{ position: "sticky", top: 16, zIndex: 3, background: "#fff", height: 31, padding: 0, textAlign: "center", fontWeight: 400, borderBottom: ROW_BORDER }}>
                    <div style={{ fontSize: 10, lineHeight: "15px", color: weekend ? RED_TEXT : "#000" }}>{WD[w]}</div>
                    <div
                      style={{
                        fontSize: 12,
                        lineHeight: "14.4px",
                        fontWeight: 700,
                        color: weekend ? RED_TEXT : "#000",
                        ...(isToday ? { display: "inline-block", padding: "0 3px", borderRadius: 3, background: "rgb(13, 110, 253)", color: "#fff" } : {}),
                      }}
                    >
                      {Number(d.slice(8, 10))}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={n + 1} style={{ padding: "12px 0", fontSize: 13, color: "rgba(0,0,0,0.6)" }}>
                  Ничего не найдено.
                </td>
              </tr>
            ) : null}
            {shown.map((row, i) => (
              <Fragment key={row.id}>
              {row.group && row.group !== shown[i - 1]?.group ? (
                <tr>
                  <th style={{ position: "sticky", left: 0, zIndex: 2, background: "#fff", height: 56, padding: "24px 8px 6px 0", textAlign: "left", verticalAlign: "bottom", fontSize: 16, lineHeight: "16px", fontWeight: 700, borderBottom: ROW_BORDER }}>
                    {row.group}
                  </th>
                  <td colSpan={n} style={{ borderBottom: ROW_BORDER }} />
                </tr>
              ) : null}
              <tr>
                <th style={{ position: "sticky", left: 0, zIndex: 2, background: "#fff", height: ROW_H, padding: "0 8px 0 0", textAlign: "left", fontWeight: 400, borderBottom: ROW_BORDER }}>
                  <span title={row.title} style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 11, lineHeight: "13.2px", fontWeight: 500, color: BLUE, opacity: row.muted ? 0.55 : 1 }}>
                    {row.title}
                  </span>
                </th>
                <td colSpan={n} style={{ padding: 0, height: ROW_H, borderBottom: ROW_BORDER, position: "relative" }}>
                  <div style={{ position: "relative", height: ROW_H - 1, width: n * DAY_W }}>
                    {row.bars.map((b) => {
                      const g = geometry(b);
                      if (!g) return null;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          title={b.title}
                          onClick={() => setOpen(b.info)}
                          style={{
                            position: "absolute",
                            left: g.left,
                            width: g.width,
                            top: 0,
                            height: 26,
                            padding: "2px 0 3px 2px",
                            margin: 0,
                            border: b.dashed ? "1px dashed rgba(0,0,0,0.55)" : 0,
                            background: b.paidFull ? "rgb(250, 218, 152)" : "rgba(254, 0, 0, 0.5)",
                            cursor: "pointer",
                            overflow: "hidden",
                            textAlign: "left",
                            fontFamily: "inherit",
                            zIndex: 1,
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: 4, height: 11, marginTop: 4, paddingLeft: 1, fontSize: 10, lineHeight: "11px", color: "rgb(34, 34, 34)", whiteSpace: "nowrap" }}>
                            {b.pin && !g.clippedLeft ? (
                              <span
                                title={b.pin.title}
                                style={{ flexShrink: 0, width: 11, height: 11, borderRadius: "50%", background: b.pin.bg, color: b.pin.color, fontSize: 8, lineHeight: "11px", textAlign: "center" }}
                              >
                                {b.pin.letter}
                              </span>
                            ) : null}
                            <span style={{ overflow: "hidden", textOverflow: "clip" }}>{b.label}</span>
                          </span>
                          <span style={{ position: "absolute", left: 3, right: 2, top: 21, height: 2, background: "#fff" }}>
                            <span style={{ display: "block", height: 2, width: `${Math.round(Math.min(Math.max(b.paid, 0), 1) * 100)}%`, background: "rgb(126, 211, 33)" }} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <BarInfoModal open={open} onClose={() => setOpen(null)} />
    </div>
  );
}
