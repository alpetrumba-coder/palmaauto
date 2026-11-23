/**
 * Приём накладных из УНФ (Рубин) по контрагенту «Прораб Дима Леготкин».
 * Присылает задача на сервере Powerbase (POST /api/repair/unf-import). Здесь:
 *  • новая расходная накладная → накладная ремонта + расход из «Кассы Гумистинская»;
 *    назначение — по комментарию УНФ: «Акиртава» → ремонт, «Пальма» → журнал Пальмы (на проверку), иначе — «без пометки»;
 *  • возврат товара → приход на «Кассу Гумистинская» (служебная статья, не доход);
 *  • сальдо УНФ сравнивается с остатком «Кассы Гумистинская»; расхождение — сообщение владельцам.
 */
import { getAccountBalances } from "@/lib/accounting";
import { getSetting, setSetting } from "@/lib/app-settings";
import { formatKop } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { createRepairDoc, ensureRepairSeed, loadEstimate, matchEstimate, notifyOwners, offEstimateText, RUBIN_ACCOUNT } from "@/lib/repair";

export type UnfLine = { name: string; article?: string | null; unit?: string | null; qty?: number | null; price?: number | null; sum: number };
export type UnfDoc = { ref: string; number: string; date: string; comment?: string | null; kind: "sale" | "return"; lines: UnfLine[] };
export type UnfPayload = { docs: UnfDoc[]; saldo?: number | null; asOf?: string | null };

/** Документы раньше этой даты не загружаем: история до сверки 23.11.2026 закрыта служебной записью №4051. */
const FROM_KEY = "repair.unfImportFrom";
const DEFAULT_FROM = "2026-11-21";
const SALDO_NOTE_KEY = "repair.lastSaldoAlert";

export function destinationOf(comment: string | null | undefined): "akirtava" | "palma" | "unknown" {
  const c = (comment ?? "").toLowerCase().replace(/ё/g, "е");
  if (/(акирт|акерт|киртав|кертав)/.test(c)) return "akirtava";
  if (/пальм/.test(c)) return "palma";
  return "unknown";
}

const rk = (rub: number | null | undefined) => (rub == null ? null : Math.round(rub * 100));

export async function importUnf(payload: UnfPayload) {
  await ensureRepairSeed();
  const from = (await getSetting(FROM_KEY)) ?? DEFAULT_FROM;
  const acc = await prisma.cashAccount.findUnique({ where: { name: RUBIN_ACCOUNT } });
  if (!acc) throw new Error(`Нет кассы «${RUBIN_ACCOUNT}».`);
  const items = await loadEstimate();
  const result = { created: [] as string[], skipped: 0, tooOld: 0, errors: [] as string[], saldoSite: null as number | null, saldoUnf: payload.saldo ?? null, saldoAlert: false };

  for (const d of payload.docs ?? []) {
    try {
      if (!d.ref || !d.date || !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) throw new Error("нет ref или даты");
      if (d.date < from) {
        result.tooOld++;
        continue;
      }
      const externalRef = `unf:${d.kind === "return" ? "vp" : "rn"}:${d.ref}`;
      if (await prisma.repairDoc.findUnique({ where: { externalRef }, select: { id: true } })) {
        result.skipped++;
        continue;
      }
      const destination = d.kind === "return" ? "akirtava" : destinationOf(d.comment);
      const lines = (d.lines ?? [])
        .filter((l) => l && l.name && Number.isFinite(l.sum) && l.sum !== 0)
        .map((l) => {
          const m = destination === "akirtava" ? matchEstimate(`${l.name} ${l.article ?? ""}`, items, "material")[0] : undefined;
          return { name: l.name, article: l.article ?? null, unit: l.unit ?? null, qty: l.qty ?? null, priceKop: rk(l.price), sumKop: Math.abs(rk(l.sum) ?? 0), estimateItemId: m?.item.id ?? null, matchMode: m?.mode ?? "none" };
        });
      if (lines.length === 0) throw new Error("нет строк");
      const r = await createRepairDoc({
        source: "unf",
        externalRef,
        number: d.number,
        date: new Date(`${d.date}T00:00:00Z`),
        supplier: "ООО «ТДР» (Рубин)",
        kind: d.kind === "return" ? "return" : "goods",
        destination,
        accountId: acc.id,
        comment: d.comment?.trim() ? `Комментарий УНФ: ${d.comment.trim()}` : null,
        lines,
        createdBy: "УНФ (автозагрузка)",
      });
      result.created.push(`${d.number} → журнал №${r.opNumber}`);
      const total = lines.reduce((s, l) => s + l.sumKop, 0);
      const title = `${d.kind === "return" ? "Возврат" : "Накладная"} ${d.number} от ${d.date.split("-").reverse().join(".")} — ${formatKop(total)}`;
      if (destination === "unknown") {
        await notifyOwners(`Рубин: ${title} на «Прораб Дима Леготкин» без пометки «Акиртава»/«Пальма». Укажите назначение: palmaauto.ru/admin-panel/remont-akirtava/nakladnye?dest=unknown`);
      } else if (destination === "akirtava" && d.kind !== "return") {
        const off = lines.filter((l) => !l.estimateItemId);
        if (off.length) await notifyOwners(offEstimateText(title, off, "УНФ"));
      }
    } catch (e) {
      result.errors.push(`${d?.number ?? "?"}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // сверка остатка кассы с сальдо УНФ (наш долг перед контрагентом)
  const bal = (await getAccountBalances()).find((b) => b.id === acc.id);
  result.saldoSite = bal ? bal.balanceKop / 100 : null;
  if (payload.saldo != null && bal) {
    const unfKop = Math.round(payload.saldo * 100);
    const diff = bal.balanceKop - unfKop;
    const note = diff === 0 ? "ok" : `${unfKop}:${bal.balanceKop}`;
    const last = await getSetting(SALDO_NOTE_KEY);
    if (note !== last) {
      if (diff !== 0) {
        result.saldoAlert = true;
        await notifyOwners(
          `Касса «${RUBIN_ACCOUNT}» не сходится с УНФ${payload.asOf ? ` на ${payload.asOf}` : ""}:\n` +
            `на сайте ${formatKop(bal.balanceKop)}, в УНФ (Прораб Дима Леготкин) ${formatKop(unfKop)}, разница ${formatKop(diff)}.\n` +
            `Чаще всего это сданные Евой деньги, ещё не внесённые перемещением, или возврат/оплата в Рубине.`,
        );
      }
      await setSetting(SALDO_NOTE_KEY, note, { by: "УНФ (автозагрузка)" });
    }
  }
  return result;
}
