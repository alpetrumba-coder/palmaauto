import { Resend } from "resend";

import { getAppBaseUrl } from "@/lib/app-url";
import { formatBookingUserLabel } from "@/lib/booking-display";
import { formatDateInputUTC } from "@/lib/rental-dates";

/** Письмо со ссылкой сброса пароля (Resend). */
export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
  const base = getAppBaseUrl();
  const link = `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    console.warn("[mail] RESEND_API_KEY не задан. Ссылка сброса пароля:", link);
    return;
  }

  const resend = new Resend(key);
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  await resend.emails.send({
    from,
    to,
    subject: "Сброс пароля — ПальмаАвто",
    html: `<p>Здравствуйте.</p><p>Чтобы задать новый пароль, перейдите по ссылке (действует 1 час):</p><p><a href="${link}">${link}</a></p>`,
  });
}

export type AdminBookingEmailInput = {
  bookingId: string;
  status: string;
  startDate: Date;
  endDate: Date;
  days: number;
  totalPriceRub: number;
  car: { make: string; model: string; slug: string };
  user: { email: string; firstName: string | null; lastName: string | null; patronymic: string | null; phone: string | null };
};

/** Уведомление администратору о новой брони (Resend). */
export async function sendAdminBookingCreatedEmail(input: AdminBookingEmailInput): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const base = getAppBaseUrl();

  const fromStr = formatDateInputUTC(input.startDate);
  const adminLink = `${base}/admin-panel/bookings?from=${encodeURIComponent(fromStr)}`;

  if (!to) {
    console.warn("[mail] ADMIN_NOTIFY_EMAIL не задан. Новая бронь:", input.bookingId, adminLink);
    return;
  }
  if (!key) {
    console.warn("[mail] RESEND_API_KEY не задан. Новая бронь:", input.bookingId, adminLink);
    return;
  }

  const resend = new Resend(key);
  const userLabel = formatBookingUserLabel(input.user);
  const carLabel = `${input.car.make} ${input.car.model}`.trim();
  const subject = `Новая бронь ${carLabel} (${fromStr} → ${formatDateInputUTC(input.endDate)})`;

  const text = [
    `Новая бронь в ПальмаАвто`,
    ``,
    `ID: ${input.bookingId}`,
    `Статус: ${input.status}`,
    `Машина: ${carLabel} (/${input.car.slug})`,
    `Период: ${fromStr} → ${formatDateInputUTC(input.endDate)} (${input.days} сут.)`,
    `Сумма: ${input.totalPriceRub} ₽`,
    ``,
    `Клиент: ${userLabel}`,
    `Email: ${input.user.email}`,
    `Телефон: ${input.user.phone ?? "—"}`,
    ``,
    `Открыть в админке: ${adminLink}`,
  ].join("\n");

  const html = `
    <p><strong>Новая бронь в ПальмаАвто</strong></p>
    <ul>
      <li><strong>ID:</strong> ${input.bookingId}</li>
      <li><strong>Статус:</strong> ${input.status}</li>
      <li><strong>Машина:</strong> ${carLabel} (<code>/${input.car.slug}</code>)</li>
      <li><strong>Период:</strong> ${fromStr} → ${formatDateInputUTC(input.endDate)} (${input.days} сут.)</li>
      <li><strong>Сумма:</strong> ${input.totalPriceRub} ₽</li>
    </ul>
    <p><strong>Клиент:</strong> ${userLabel}<br/>
    <strong>Email:</strong> ${input.user.email}<br/>
    <strong>Телефон:</strong> ${input.user.phone ?? "—"}</p>
    <p><a href="${adminLink}">Открыть в админ-панели</a></p>
  `.trim();

  await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  });
}
