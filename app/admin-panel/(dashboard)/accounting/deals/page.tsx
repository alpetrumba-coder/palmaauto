import type { Metadata } from "next";
import Link from "next/link";

import { getDealTotals } from "@/lib/accounting";
import { fmtDate } from "@/lib/accounting-options";
import { formatKop } from "@/lib/money";
import { parseDateInput } from "@/lib/rental-dates";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = {
  title: "Заезды и аренды — админ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SP = { asset?: string; from?: string; to?: string; status?: string; kind?: string };

const cell: React.CSSProperties = { padding: "0.55rem 0.7rem", borderBottom: "1px solid var(--color-border)", verticalAlign: "top" };
const field: React.CSSProperties = {
  padding: "0.45rem 0.55rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
  font: "inherit",
};
const bigBtn: React.CSSProperties = {
  display: "inline-flex",
  padding: "0.7rem 1.2rem",
  borderRadius: "999px",
  background: "var(--color-accent)",
  color: "#fff",
  fontWeight: 700,
  textDecoration: "none",
};

export default async function DealsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdminPanelSession();
  const sp = await searchParams;
  const from = sp.from ? parseDateInput(sp.from) : null;
  const to = sp.to ? parseDateInput(sp.to) : null;

  const where: Prisma.DealWhereInput = {
    ...(sp.status === "all" ? {} : sp.status === "cancelled" ? { status: "CANCELLED" } : { status: "ACTIVE" }),
    ...(sp.asset ? { assetId: sp.asset } : {}),
    ...(sp.kind === "APARTMENT" || sp.kind === "CAR" ? { asset: { kind: sp.kind } } : {}),
    ...(from || to ? { startDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };

  const [deals, assets] = await Promise.all([
    prisma.deal.findMany({
      where,
      include: { asset: { select: { name: true, kind: true } }, channel: { select: { name: true } } },
      orderBy: [{ startDate: "desc" }, { number: "desc" }],
      take: 300,
    }),
    prisma.asset.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);
  const totals = await getDealTotals(deals.map((d) => d.id));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", margin: 0 }}>Заезды и аренды</h1>
        <Link href="/admin-panel/accounting/deals/new" style={bigBtn}>
          + Заезд / аренда
        </Link>
      </div>
      <p style={{ margin: "0.5rem 0 1rem", fontSize: "var(--text-sm)" }}>
        <Link href="/admin-panel/accounting">← К остаткам и журналу</Link>
      </p>

      <form method="get" style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "end", marginBottom: "1rem", fontSize: "var(--text-sm)" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          Тип
          <select name="kind" defaultValue={sp.kind ?? ""} style={field}>
            <option value="">все</option>
            <option value="APARTMENT">квартиры</option>
            <option value="CAR">авто</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          Объект
          <select name="asset" defaultValue={sp.asset ?? ""} style={field}>
            <option value="">все</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          Начало с
          <input type="date" name="from" defaultValue={sp.from ?? ""} style={field} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          по
          <input type="date" name="to" defaultValue={sp.to ?? ""} style={field} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          Статус
          <select name="status" defaultValue={sp.status ?? ""} style={field}>
            <option value="">действующие</option>
            <option value="cancelled">отменённые</option>
            <option value="all">все</option>
          </select>
        </label>
        <button type="submit" style={{ ...field, cursor: "pointer", fontWeight: 600 }}>Показать</button>
        <Link href="/admin-panel/accounting/deals" style={{ paddingBottom: "0.45rem" }}>Сбросить</Link>
      </form>

      {deals.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)" }}>Ничего не найдено. Нажмите «+ Заезд / аренда».</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
            <thead>
              <tr style={{ background: "var(--color-surface)", textAlign: "left" }}>
                {["№", "Объект", "Гость", "Даты", "Сумма", "Оплачено", "Осталось", "Расходы", "Канал"].map((h) => (
                  <th key={h} style={{ ...cell, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => {
                const t = totals.get(d.id) ?? { paidKop: 0, expenseKop: 0 };
                const left = d.grossKop - t.paidKop;
                const cancelled = d.status === "CANCELLED";
                return (
                  <tr key={d.id} style={{ opacity: cancelled ? 0.5 : 1 }}>
                    <td style={cell}>
                      <Link href={`/admin-panel/accounting/deals/${d.id}`} style={{ fontWeight: 600 }}>№{d.number}</Link>
                      {cancelled ? <div style={{ fontSize: "var(--text-xs)" }}>отменён</div> : null}
                    </td>
                    <td style={cell}>{d.asset.name}</td>
                    <td style={cell}>{d.guestName}</td>
                    <td style={{ ...cell, whiteSpace: "nowrap" }}>
                      {fmtDate(d.startDate)} – {fmtDate(d.endDate)}
                    </td>
                    <td style={{ ...cell, whiteSpace: "nowrap" }}>{formatKop(d.grossKop)}</td>
                    <td style={{ ...cell, whiteSpace: "nowrap" }}>{formatKop(t.paidKop)}</td>
                    <td style={{ ...cell, whiteSpace: "nowrap", fontWeight: 600, color: !cancelled && left > 0 ? "var(--color-danger, #b00020)" : undefined }}>
                      {cancelled ? "—" : formatKop(left)}
                    </td>
                    <td style={{ ...cell, whiteSpace: "nowrap" }}>{formatKop(t.expenseKop)}</td>
                    <td style={cell}>{d.channel?.name ?? "напрямую"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
