import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { serverEnv } from "@/config/env.server";
import { PrismaClient } from "@/prisma/client";

/**
 * The single Prisma Client entry point (server-only).
 *
 * - Serverless gives every instance its own pool, so `max` stays small; concurrency scales with instances.
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
    max: 3,
    idleTimeoutMillis: 5_000,
  });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
