/**
 * Нормализация строки подключения для Neon + Prisma на serverless (Vercel).
 *
 * - `channel_binding=require` из консоли Neon часто ломает node-pg.
 * - Для хоста с pooler нужен `pgbouncer=true`, иначе Prisma (prepared statements) падает через PgBouncer.
 * @see https://www.prisma.io/docs/orm/overview/databases/neon
 */
export function prepareDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");

    const host = u.hostname;
    const isNeonPooler = host.includes("-pooler") || /\.pooler\.neon\.tech$/i.test(host);

    if (isNeonPooler) {
      u.searchParams.set("pgbouncer", "true");
      if (!u.searchParams.has("connection_limit")) {
        u.searchParams.set("connection_limit", "1");
      }
    }

    return u.toString();
  } catch {
    return url;
  }
}
