"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createLaundryAction, previewLaundryAction, type LaundryPreview } from "@/app/actions/laundry";

const field: React.CSSProperties = {
  padding: "0.7rem 0.8rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
  font: "inherit",
  fontSize: "16px",
  width: "100%",
};
const label: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" };
const btn: React.CSSProperties = { padding: "0.65rem 1.1rem", borderRadius: "999px", border: "none", background: "var(--color-accent)", color: "#fff", fontWeight: 700, cursor: "pointer" };
const rub = (kop: number) => `${(kop / 100).toLocaleString("ru-RU")} ₽`;
const today = () => new Date().toISOString().slice(0, 10);

/** Стирка одной суммой → поровну на краткосрочные заезды без стирки (сначала список, потом запись). */
export function LaundryForm({ accounts, defaultAccountId }: { accounts: { id: string; name: string }[]; defaultAccountId?: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(defaultAccountId ?? "");
  const [date, setDate] = useState(today());
  const [preview, setPreview] = useState<Extract<LaundryPreview, { ok: true }>["rows"] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function show(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setPending(true);
    const r = await previewLaundryAction(amount);
    setPending(false);
    if (!r.ok) {
      setPreview(null);
      setMsg(r.error);
      return;
    }
    setPreview(r.rows);
  }

  async function save() {
    if (!preview) return;
    setPending(true);
    const r = await createLaundryAction({ amount, accountId, date, dealIds: preview.map((x) => x.dealId) });
    setPending(false);
    if (!r.ok) {
      setMsg(r.error);
      return;
    }
    setMsg(`Записано ${r.count} операций.`);
    setPreview(null);
    setAmount("");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: "40rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <form onSubmit={show} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))", gap: "0.75rem", alignItems: "end" }}>
        <label style={label}>
          Сумма за стирку, ₽ *
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} style={field} autoComplete="off" />
        </label>
        <label style={label}>
          Из какой кассы *
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={field}>
            <option value="">— выберите —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label style={label}>
          Дата
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={field} />
        </label>
        <button type="submit" disabled={pending} style={btn}>
          Показать брони
        </button>
      </form>

      {msg ? <p style={{ margin: 0, fontWeight: 600 }}>{msg}</p> : null}

      {preview ? (
        <>
          <p style={{ margin: 0, fontSize: "var(--text-sm)" }}>
            Поровну на {preview.length} заездов без стирки (остаток копеек — на последний):
          </p>
          <table style={{ borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
            <tbody>
              {preview.map((r) => (
                <tr key={r.dealId}>
                  <td style={{ padding: "0.3rem 0.6rem", borderBottom: "1px solid var(--color-border)" }}>№{r.number}</td>
                  <td style={{ padding: "0.3rem 0.6rem", borderBottom: "1px solid var(--color-border)" }}>{r.assetName}</td>
                  <td style={{ padding: "0.3rem 0.6rem", borderBottom: "1px solid var(--color-border)" }}>{r.guestName}</td>
                  <td style={{ padding: "0.3rem 0.6rem", borderBottom: "1px solid var(--color-border)" }}>выезд {r.endDate.split("-").reverse().join(".")}</td>
                  <td style={{ padding: "0.3rem 0.6rem", borderBottom: "1px solid var(--color-border)", fontWeight: 600 }}>{rub(r.kop)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div>
            <button type="button" onClick={save} disabled={pending || !accountId} style={btn}>
              Записать {preview.length} операций
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
