import { Resend } from "resend";

import { getAppBaseUrl } from "@/lib/app-url";

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
