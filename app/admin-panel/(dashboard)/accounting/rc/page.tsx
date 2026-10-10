import type { Metadata } from "next";
import Link from "next/link";

import { RcCredentialsForm } from "@/components/admin/RcCredentialsForm";
import { RcRowButton } from "@/components/admin/RcRowButton";
import { RcSyncPanel } from "@/components/admin/RcSyncPanel";
import { getSetting, hasSetting } from "@/lib/app-settings";
import { formatKop } from "@/lib/money";
import { RC_LOGIN_KEY, RC_PASSWORD_KEY, rcConfigured } from "@/lib/rc-client";
import type { RcRunSummary } from "@/lib/rc-sync";
import { prisma } from "@/lib/prisma";
import { requireAdminPanelSession } from "@/lib/require-admin-panel";

export const metadata: Metadata = {
  title: "Сверка с RealtyCalendar — админ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const cell: React.CSSProperties = { padding: "0.5rem 0.7rem", borderBottom: "1px solid var(--color-border)", verticalAlign: "top" };
const fmtDt = (d: Date) => d.toLocaleString("ru-RU", { timeZone: "Europe/Moscow", dateStyle: "short", timeStyle: "short" });
const rd = (s: string) => `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(2, 4)}`;

function Section({ title, hint, count, children }: { title: string; hint?: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <section style={{ margin: "1.5rem 0 0" }}>
      <h2 style={{ fontSize: "var(--text-lg)", margin: "0 0 0.25rem" }}>
        {title} · {count}
      </h2>
      {hint ? <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", maxWidth: "58rem" }}>{hint}</p> : null}
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: "var(--text-sm)", minWidth: "100%" }}>{children}</table>
      </div>
    </section>
  );
}

const Th = ({ children }: { children?: React.ReactNode }) => (
  <th style={{ ...cell, fontWeight: 600, textAlign: "left", background: "var(--color-surface)", whiteSpace: "nowrap" }}>{children}</th>
);

export default async function RcSyncPage() {
  const session = await requireAdminPanelSession();
  const [last, history] = await Promise.all([
    prisma.rcSyncRun.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.rcSyncRun.findMany({ orderBy: { startedAt: "desc" }, take: 8, select: { id: true, startedAt: true, trigger: true, status: true, error: true } }),
  ]);
  const res = last?.status === "ok" ? (last.result as RcRunSummary | null) : null;
  const fromEnv = !!process.env.RC_LOGIN && !!process.env.RC_PASSWORD;
  const configured = await rcConfigured();
  const savedLogin = (await getSetting(RC_LOGIN_KEY)) ?? "";
  const passwordSaved = await hasSetting(RC_PASSWORD_KEY);
  const TRIG: Record<string, string> = { cron: "по расписанию", manual: "вручную", check: "проверка" };

  return (
    <>
      <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)" }}>
        <Link href="/admin-panel/accounting">← К остаткам и журналу</Link>
      </p>
      <h1 style={{ fontSize: "var(--text-2xl)", margin: "0 0 0.5rem" }}>Сверка с RealtyCalendar</h1>
      <p style={{ margin: "0 0 1rem", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", maxWidth: "58rem" }}>
        Раз в неделю служба заходит в RealtyCalendar служебной учётной записью (только чтение) и сравнивает брони с вашими заездами: 45 дней назад — 150 вперёд.
        Ничего не исправляет сама: показывает, чего не хватает и что расходится. Единственное, что она делает сама, — связывает заезд с бронью при точном совпадении объекта и дат.
      </p>

      <ul style={{ margin: "0 0 1rem", paddingLeft: "1.1rem", fontSize: "var(--text-sm)" }}>
        <li>Доступ к RealtyCalendar: {configured ? "логин и пароль заданы" : <strong style={{ color: "var(--color-danger, #b00020)" }}>не заданы — введите ниже</strong>}</li>
        <li>Расписание: каждый понедельник около 08:00 по Москве сервер сам запускает сверку (если доступ задан).</li>
      </ul>

      {session.role === "OWNER" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <RcCredentialsForm savedLogin={savedLogin} passwordSaved={passwordSaved} fromEnv={fromEnv} />
          <RcSyncPanel />
        </div>
      ) : <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>Запускать сверку и проверять подключение может владелец.</p>}

      <h2 style={{ fontSize: "var(--text-lg)", margin: "1.5rem 0 0.5rem" }}>Последняя сверка</h2>
      {!last ? (
        <p>Сверок ещё не было.</p>
      ) : last.status === "error" ? (
        <p role="alert" style={{ color: "var(--color-danger, #b00020)" }}>
          {fmtDt(last.startedAt)} ({TRIG[last.trigger] ?? last.trigger}): не удалось. {last.error}
        </p>
      ) : res ? (
        <>
          <p style={{ margin: "0 0 0.6rem", fontSize: "var(--text-sm)" }}>
            {fmtDt(last.startedAt)} ({TRIG[last.trigger] ?? last.trigger}) · период {last.periodFrom?.toISOString().slice(0, 10)} — {last.periodTo?.toISOString().slice(0, 10)} · броней в RealtyCalendar: {res.summary.rcEvents}, заездов у нас: {res.summary.ourDeals}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))", gap: "0.6rem" }}>
            {[
              ["Совпало", res.summary.matched, "var(--color-success, #1a7f37)"],
              ["Нет у нас", res.summary.missing, res.summary.missing ? "var(--color-danger, #b00020)" : undefined],
              ["Расходятся", res.summary.differs, res.summary.differs ? "var(--color-danger, #b00020)" : undefined],
              ["Только у нас", res.summary.onlyOurs, undefined],
              ["Оплата отличается", res.summary.paidDiffer, undefined],
              ["Объект не опознан", res.summary.unmappedEvents, undefined],
            ].map(([label, n, color]) => (
              <div key={String(label)} style={{ padding: "0.6rem 0.8rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", background: "var(--color-surface)" }}>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{String(label)}</div>
                <div style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: color as string | undefined }}>{String(n)}</div>
              </div>
            ))}
          </div>
          {res.summary.autoLinked ? <p style={{ fontSize: "var(--text-sm)" }}>Автоматически связано с бронями: {res.summary.autoLinked}.</p> : null}

          <Section title="Есть в RealtyCalendar, нет у нас" count={res.missing.length} hint="Брони, для которых нет заезда с такими же объектом и датами. «Создать заезд» заполнит карточку из брони (комиссия площадки считается по сезону); оплаты внесите операциями.">
            <thead><tr><Th>Объект</Th><Th>Даты</Th><Th>Гость</Th><Th>Источник</Th><Th>Сумма</Th><Th>В RC оплачено</Th><Th></Th></tr></thead>
            <tbody>
              {res.missing.map((m) => (
                <tr key={m.rcId}>
                  <td style={cell}>{m.assetName}</td>
                  <td style={{ ...cell, whiteSpace: "nowrap" }}>{rd(m.begin)} – {rd(m.end)}</td>
                  <td style={cell}>{m.guest}</td>
                  <td style={cell}>{m.source || "—"}</td>
                  <td style={{ ...cell, whiteSpace: "nowrap" }}>{formatKop(m.amountKop)}</td>
                  <td style={{ ...cell, whiteSpace: "nowrap" }}>{formatKop(m.paidKop)}</td>
                  <td style={cell}><RcRowButton kind="create" rcId={m.rcId} /></td>
                </tr>
              ))}
            </tbody>
          </Section>

          <Section title="Расходятся" count={res.differs.length} hint="Заезд и бронь, похожие друг на друга, но с разными датами, суммой или гостем. Если это одна бронь — исправьте заезд у нас или в RealtyCalendar и нажмите «Это он — связать».">
            <thead><tr><Th>Объект</Th><Th>В RealtyCalendar</Th><Th>У нас</Th><Th>Что расходится</Th><Th></Th></tr></thead>
            <tbody>
              {res.differs.map((d) => (
                <tr key={d.rc.rcId}>
                  <td style={cell}>{d.rc.assetName}</td>
                  <td style={cell}>{rd(d.rc.begin)} – {rd(d.rc.end)} · {d.rc.guest} · {formatKop(d.rc.amountKop)}</td>
                  <td style={cell}><Link href={`/admin-panel/accounting/deals/${d.deal.id}`}>№{d.deal.number}</Link> {rd(d.deal.startDate)} – {rd(d.deal.endDate)} · {d.deal.guestName} · {formatKop(d.deal.grossKop)}</td>
                  <td style={{ ...cell, whiteSpace: "normal", color: "var(--color-danger, #b00020)" }}>{d.problems.join("; ")}</td>
                  <td style={cell}><RcRowButton kind="link" rcId={d.rc.rcId} dealId={d.deal.id} /></td>
                </tr>
              ))}
            </tbody>
          </Section>

          <Section title="Только у нас" count={res.onlyOurs.length} hint="Заезды, которых нет в RealtyCalendar: бронь могли отменить или удалить там, либо заезд внесён вручную без брони. Проверьте и при необходимости отмените заезд.">
            <thead><tr><Th>№</Th><Th>Объект</Th><Th>Даты</Th><Th>Гость</Th><Th>Сумма</Th></tr></thead>
            <tbody>
              {res.onlyOurs.map((o) => (
                <tr key={o.dealId}>
                  <td style={cell}><Link href={`/admin-panel/accounting/deals/${o.dealId}`}>№{o.number}</Link></td>
                  <td style={cell}>{o.assetName}</td>
                  <td style={{ ...cell, whiteSpace: "nowrap" }}>{rd(o.startDate)} – {rd(o.endDate)}</td>
                  <td style={cell}>{o.guestName}</td>
                  <td style={{ ...cell, whiteSpace: "nowrap" }}>{formatKop(o.grossKop)}</td>
                </tr>
              ))}
            </tbody>
          </Section>

          <Section title="Оплата отличается" count={res.paidDiffer.length} hint="Заезд совпал, но в RealtyCalendar оплачено одно, а у нас внесено другое. Обычно значит, что оплату не внесли операцией («+ Оплата» в карточке заезда).">
            <thead><tr><Th>Заезд</Th><Th>Объект</Th><Th>Гость</Th><Th>В RC оплачено</Th><Th>У нас внесено</Th></tr></thead>
            <tbody>
              {res.paidDiffer.map((p) => (
                <tr key={p.rc.rcId}>
                  <td style={cell}>№{p.dealNumber}</td>
                  <td style={cell}>{p.rc.assetName}</td>
                  <td style={cell}>{p.rc.guest}</td>
                  <td style={{ ...cell, whiteSpace: "nowrap" }}>{formatKop(p.rc.paidKop)}</td>
                  <td style={{ ...cell, whiteSpace: "nowrap" }}>{formatKop(p.dealPaidKop)}</td>
                </tr>
              ))}
            </tbody>
          </Section>

          <Section title="Объект не опознан" count={res.unmapped.length} hint="Названия объектов из RealtyCalendar, которым нет пары у нас. Впишите название в «Справочники → Объекты → Название в RealtyCalendar» (несколько названий — по одному в строке). Прокат авто и другие объекты, которые не нужны, можно оставить.">
            <thead><tr><Th>Название в RealtyCalendar</Th><Th>Броней</Th></tr></thead>
            <tbody>
              {res.unmapped.map((u) => (
                <tr key={u.address}>
                  <td style={cell}>{u.address}</td>
                  <td style={cell}>{u.count}</td>
                </tr>
              ))}
            </tbody>
          </Section>
        </>
      ) : null}

      <h2 style={{ fontSize: "var(--text-lg)", margin: "1.75rem 0 0.5rem" }}>Журнал запусков</h2>
      {history.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)" }}>Пока пусто.</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "var(--text-sm)" }}>
          {history.map((h) => (
            <li key={h.id}>
              {fmtDt(h.startedAt)} · {TRIG[h.trigger] ?? h.trigger} · {h.status === "ok" ? "успешно" : <span style={{ color: "var(--color-danger, #b00020)" }}>ошибка: {h.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
