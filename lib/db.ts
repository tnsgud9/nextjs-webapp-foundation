import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { serverEnv } from "@/config/env.server";
import { PrismaClient } from "@/prisma/client";

/**
 * The single Prisma Client entry point (server-only).
 *
 * - Every instance (a container or a serverless function) has its own pool of `DATABASE_POOL_MAX`
 *   connections (default 3), so concurrency scales with instances. Keep instances × that value within
 *   the pooler's client limit.
 * - Idle connections close quickly so a suspended instance does not hold them.
 * - The transaction pooler switches connections per query, so named prepared statements cannot be used.
 *   The adapter uses unnamed statements by default; do not enable `statementNameGenerator`.
 * - In development the client and pool live on globalThis so HMR re-evaluation does not pile them up.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  if (!serverEnv.databaseUrl) {
    throw new Error("DATABASE_URL is not set. See .env.example.");
  }
  const adapter = new PrismaPg({
    connectionString: serverEnv.databaseUrl,
    max: serverEnv.databasePoolMax,
    idleTimeoutMillis: 5_000,
  });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
