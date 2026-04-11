/** Базовый URL сайта для ссылок в письмах (сброс пароля). */
export function getAppBaseUrl(): string {
  if (process.env.AUTH_URL) {
    return process.env.AUTH_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}
