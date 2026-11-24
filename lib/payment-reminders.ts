/**
 * Напоминание в Telegram о платежах по долгосрочным броням: раз в день (после 08:00 МСК, вместе со сверкой RC)
 * сотрудникам приходит список «сегодня платит» и «просрочено». Не дублируется: дата последней рассылки — в настройках.
 */
import { getSetting, setSetting } from "@/lib/app-settings";
import { getExpectedReceipts } from "@/lib/expected-receipts";
import { formatKop } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { utcToday } from "@/lib/rental-dates";
import { sendMessage, telegramConfigured } from "@/lib/telegram";

const LAST_KEY = "payment_reminders.last_date";
/** Не учёт квартир: прораб ремонта. */
const NOT_RECIPIENTS = ["Дмитрий"];
const DAY = 86400000;

export async function buildPaymentReminderText(today: Date): Promise<string | null> {
  const todayIso = today.toISOString().slice(0, 10);
  const fromIso = new Date(today.getTime() - 60 * DAY).toISOString().slice(0, 10);
  const rows = (await getExpectedReceipts(today)).filter((r) => r.installment && r.date <= todayIso && r.date >= fromIso);
  if (rows.length === 0) return null;
  const line = (r: (typeof rows)[number]) =>
    `• №${r.number} ${r.guestName}, ${r.assetName} — ${formatKop(r.amountKop)} за ${r.installment!.period} (платёж ${r.installment!.index} из ${r.installment!.count})`;
  const due = rows.filter((r) => r.date === todayIso);
  const late = rows.filter((r) => r.date < todayIso);
  let text = "💰 Помесячные оплаты долгосрочных броней\n";
  if (due.length) text += `\nСегодня платят:\n${due.map(line).join("\n")}\n`;
  if (late.length) text += `\nПросрочено (денег в учёте нет):\n${late.map(line).join("\n")}\n`;
  text += "\nКогда деньги придут — запишите приходом с номером брони — в боте или кнопкой «+ Оплата» в карточке брони.";
  return text;
}

export async function sendPaymentRemindersIfDue(now = new Date()): Promise<void> {
  if (now.getUTCHours() < 5 || !telegramConfigured()) return; // не раньше 08:00 МСК
  const today = utcToday();
  const todayIso = today.toISOString().slice(0, 10);
  if ((await getSetting(LAST_KEY)) === todayIso) return;
  await setSetting(LAST_KEY, todayIso, { by: "system" });
  const text = await buildPaymentReminderText(today);
  if (!text) return;
  const staff = await prisma.staffUser.findMany({ where: { active: true, telegramChatId: { not: null } }, select: { name: true, telegramChatId: true } });
  for (const s of staff) {
    if (!s.telegramChatId || NOT_RECIPIENTS.includes(s.name)) continue;
    await sendMessage(s.telegramChatId, text).catch((e) => console.error("[payment-reminders]", s.name, e instanceof Error ? e.message : e));
  }
}
