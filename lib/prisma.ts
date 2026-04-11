import { PrismaClient } from "@prisma/client";

/**
 * Единый экземпляр PrismaClient на процесс.
 *
 * В режиме `next dev` при hot reload модуль может пересоздаваться;
 * без этого кэша вы быстро исчерпаете лимит соединений к PostgreSQL.
 *
 * Подробнее: https://www.prisma.io/docs/guides/database/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// В проде (Vercel serverless) тоже кэшируем на globalThis — меньше лишних клиентов в одном инстансе.
globalForPrisma.prisma = prisma;
