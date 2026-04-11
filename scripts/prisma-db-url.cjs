/**
 * Дублирует логику lib/databaseUrl.ts для scripts/build.cjs (без TypeScript).
 * При изменении правил — обновите оба файла.
 */
function prepareDatabaseUrl(url) {
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

/** Только для `prisma migrate deploy`: убрать channel_binding / pgbouncer, не добавлять pooler-режим Prisma. */
function stripForMigrateDeploy(url) {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    u.searchParams.delete("pgbouncer");
    return u.toString();
  } catch {
    return url;
  }
}

module.exports = { prepareDatabaseUrl, stripForMigrateDeploy };
