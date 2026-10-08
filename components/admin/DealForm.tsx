"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createDealAction, updateDealAction, type DealInput } from "@/app/actions/deals";

export type DealAsset = { id: string; name: string; kind: "APARTMENT" | "CAR" };
export type DealChannel = { id: string; name: string; lowPct: number; highPct: number };

type Props = {
  assets: DealAsset[];
  channels: DealChannel[];
  dealId?: string;
  initial?: DealInput;
  defaultKind?: "APARTMENT" | "CAR";
};

const fieldStyle: React.CSSProperties = {
  padding: "0.7rem 0.8rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
  font: "inherit",
  fontSize: "16px",
  width: "100%",
};
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" };

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Высокий сезон: 1 июня – 15 октября. */
function highSeason(iso: string): boolean {
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  return (m >= 6 && m <= 9) || (m === 10 && d <= 15);
}

function toKopLoose(s: string): number | null {
  const t = s.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

export function DealForm({ assets, channels, dealId, initial, defaultKind }: Props) {
  const router = useRouter();
  const [v, setV] = useState<DealInput>(
    initial ?? {
      assetId: "",
      channelId: "",
      guestName: "",
      phone: "",
      startDate: localToday(),
      endDate: localToday(),
      gross: "",
      commission: "",
      comment: "",
    },
  );
  const [commissionTouched, setCommissionTouched] = useState(!!initial);
  const [kind, setKind] = useState<"APARTMENT" | "CAR">(defaultKind ?? assets.find((a) => a.id === initial?.assetId)?.kind ?? "APARTMENT");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = <K extends keyof DealInput>(k: K, val: DealInput[K]) => setV((p) => ({ ...p, [k]: val }));

  /** Пока оператор не правил комиссию руками — пересчитываем её из процента площадки и сезона. */
  function autoCommission(next: DealInput): DealInput {
    if (commissionTouched) return next;
    const ch = channels.find((c) => c.id === next.channelId);
    const gross = toKopLoose(next.gross);
    if (!ch || gross === null) return { ...next, commission: "" };
    const pct = highSeason(next.startDate) ? ch.highPct : ch.lowPct;
    const kop = Math.round((gross * pct) / 100);
    return { ...next, commission: kop % 100 ? `${Math.floor(kop / 100)},${String(kop % 100).padStart(2, "0")}` : String(kop / 100) };
  }

  function change<K extends keyof DealInput>(k: K, val: DealInput[K]) {
    setV((p) => autoCommission({ ...p, [k]: val }));
  }

  const nights = (() => {
    const a = Date.parse(v.startDate);
    const b = Date.parse(v.endDate);
    return Number.isFinite(a) && Number.isFinite(b) && b >= a ? Math.round((b - a) / 86400000) : null;
  })();

  const gross = toKopLoose(v.gross);
  const comm = v.commission.trim() === "" ? 0 : toKopLoose(v.commission);
  const net = gross !== null && comm !== null ? gross - comm : null;
  const ch = channels.find((c) => c.id === v.channelId);
  const pct = ch ? (highSeason(v.startDate) ? ch.highPct : ch.lowPct) : null;
  const isCar = kind === "CAR";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = dealId ? await updateDealAction(dealId, v) : await createDealAction(v);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(`/admin-panel/accounting/deals/${res.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "34rem" }}>
      {!dealId ? (
        <div role="group" aria-label="Что вносим" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          {(["APARTMENT", "CAR"] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => {
                setKind(k);
                setV((p) => ({ ...p, assetId: assets.find((a) => a.id === p.assetId && a.kind === k) ? p.assetId : "" }));
              }}
              style={{
                padding: "0.8rem 0.5rem",
                borderRadius: "var(--radius-md)",
                border: kind === k ? "2px solid var(--color-accent)" : "1px solid var(--color-border)",
                background: kind === k ? "var(--color-surface)" : "transparent",
                color: "var(--color-text)",
                fontWeight: kind === k ? 700 : 400,
                cursor: "pointer",
              }}
            >
              {k === "APARTMENT" ? "Заезд (квартира)" : "Аренда авто"}
            </button>
          ))}
        </div>
      ) : null}

      <label style={labelStyle}>
        {isCar ? "Автомобиль" : "Объект"} *
        <select value={v.assetId} onChange={(e) => set("assetId", e.target.value)} style={fieldStyle}>
          <option value="">— выберите —</option>
          {assets
            .filter((a) => a.kind === kind)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </select>
      </label>

      <label style={labelStyle}>
        {isCar ? "Арендатор" : "Гость"} *
        <input value={v.guestName} onChange={(e) => set("guestName", e.target.value)} style={fieldStyle} autoComplete="off" />
      </label>

      <label style={labelStyle}>
        Телефон
        <input value={v.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" style={fieldStyle} autoComplete="off" />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <label style={labelStyle}>
          {isCar ? "Выдача" : "Заезд"} *
          <input
            type="date"
            value={v.startDate}
            onChange={(e) => {
              const start = e.target.value;
              setV((p) => autoCommission({ ...p, startDate: start, endDate: p.endDate < start ? start : p.endDate }));
            }}
            style={fieldStyle}
          />
        </label>
        <label style={labelStyle}>
          {isCar ? "Возврат" : "Выезд"} *
          <input type="date" value={v.endDate} min={v.startDate} onChange={(e) => set("endDate", e.target.value)} style={fieldStyle} />
        </label>
      </div>
      {nights !== null ? (
        <p style={{ margin: "-0.5rem 0 0", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
          {isCar ? "Суток" : "Ночей"}: {nights}
        </p>
      ) : null}

      <label style={labelStyle}>
        Сумма {isCar ? "аренды" : "заезда"}, ₽ *
        <input
          inputMode="decimal"
          value={v.gross}
          onChange={(e) => change("gross", e.target.value)}
          placeholder="сколько платит гость"
          style={{ ...fieldStyle, fontSize: "20px", fontWeight: 600 }}
          autoComplete="off"
        />
      </label>

      <label style={labelStyle}>
        Площадка / канал
        <select value={v.channelId} onChange={(e) => change("channelId", e.target.value)} style={fieldStyle}>
          <option value="">— без площадки (напрямую) —</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label style={labelStyle}>
        Комиссия площадки, ₽
        <input
          inputMode="decimal"
          value={v.commission}
          onChange={(e) => {
            setCommissionTouched(true);
            set("commission", e.target.value);
          }}
          style={fieldStyle}
          autoComplete="off"
        />
        {pct !== null && !commissionTouched ? (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
            Подставлено {pct}% ({highSeason(v.startDate) ? "высокий" : "низкий"} сезон). Можно исправить.
          </span>
        ) : null}
      </label>

      {net !== null ? (
        <p style={{ margin: 0, fontSize: "var(--text-sm)" }}>
          Нетто (за вычетом комиссии): <strong>{new Intl.NumberFormat("ru-RU").format(net / 100)} ₽</strong>
        </p>
      ) : null}

      <label style={labelStyle}>
        Комментарий
        <textarea rows={2} value={v.comment} onChange={(e) => set("comment", e.target.value)} style={{ ...fieldStyle, resize: "vertical" }} />
      </label>

      {error ? (
        <p role="alert" style={{ margin: 0, color: "var(--color-danger, #b00020)", fontSize: "var(--text-sm)" }}>
          {error}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={pending}
          className="nav-tap-target"
          style={{ padding: "0.8rem 1.6rem", borderRadius: "999px", background: "var(--color-accent)", color: "#fff", fontWeight: 700, border: "none", fontSize: "var(--text-base)", cursor: pending ? "wait" : "pointer" }}
        >
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
        <button
          type="button"
          onClick={() => router.push(dealId ? `/admin-panel/accounting/deals/${dealId}` : "/admin-panel/accounting/deals")}
          className="nav-tap-target"
          style={{ padding: "0.8rem 1.4rem", borderRadius: "999px", border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text)", cursor: "pointer", fontSize: "var(--text-base)" }}
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
