import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { serverEnv } from "@/config/env.server";
import { Prisma, PrismaClient } from "@/prisma/client";

/**
 * The single Prisma Client entry point (server-only).
 *
 * - Every instance (a container or a serverless function) has its own pool of `DATABASE_POOL_MAX`
 *   connections (default 3), so concurrency scales with instances. Keep instances × that value within
 *   the pooler's client limit.
 * - Idle connections close quickly so a suspended instance does not hold them.
 * - The transaction pooler switches connections per query, so named prepared statements cannot be used.
 *   The adapter uses unnamed statements by default; do not enable `statementNameGenerator`.
 * - A Prisma error's message, stack, and `meta` can hold the query's values: a validation error prints the
 *   arguments, and a database error quotes the value it rejected. Outside development, every query's Prisma
 *   error is rewritten before it leaves this module, so logs, Sentry, and Next's own error output never see
 *   them (`withoutQueryValues`). The error class, `code`, and the names in `meta` stay for error mapping.
 * - In development the client and pool live on globalThis so HMR re-evaluation does not pile them up.
 */
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };

const KEEPS_QUERY_VALUES = process.env.NODE_ENV === "development";

function createPrismaClient() {
  if (!serverEnv.databaseUrl) {
    throw new Error("DATABASE_URL is not set. See .env.example.");
  }
  const adapter = new PrismaPg({
    connectionString: serverEnv.databaseUrl,
    max: serverEnv.databasePoolMax,
    idleTimeoutMillis: 5_000,
  });
  return new PrismaClient({ adapter }).$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        try {
          return await query(args);
        } catch (error) {
          throw KEEPS_QUERY_VALUES ? error : withoutQueryValues(error, model, operation);
        }
      },
    },
  });
}

const PRISMA_ERRORS = [
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientRustPanicError,
];

/** Names in a known error's `meta` (no values): the model, the fields or constraint, the database's error kind. */
const META_NAMES = ["modelName", "target", "field_name", "constraint"];
const ADAPTER_CAUSE_NAMES = ["kind", "originalCode", "constraint"];

const pick = (source: unknown, keys: string[]) =>
  Object.fromEntries(
    keys
      .filter((key) => typeof source === "object" && source !== null && key in source)
      .map((key) => [key, (source as Record<string, unknown>)[key]]),
  );

/**
 * Replaces a Prisma error's message with a fixed one naming the operation and the code, drops the old message
 * from the stack, and keeps only names in `meta`. The same error object is rethrown, so its class and `code`
 * still drive error mapping. Anything that is not a Prisma error passes through unchanged.
 */
export function withoutQueryValues(error: unknown, model: string | undefined, operation: string): unknown {
  if (!PRISMA_ERRORS.some((type) => error instanceof type)) return error;
  const prismaError = error as Error & { code?: string; meta?: Record<string, unknown> };
  const call = model ? `${model.charAt(0).toLowerCase()}${model.slice(1)}.${operation}` : operation;
  const message = `prisma.${call}() failed${prismaError.code ? ` (${prismaError.code})` : ""}`;
  const frames = (prismaError.stack ?? "").split("\n").filter((line) => /^\s+at /.test(line));
  prismaError.message = message;
  prismaError.stack = [`${prismaError.name}: ${message}`, ...frames].join("\n");
  if (prismaError.meta) {
    const { driverAdapterError } = prismaError.meta as { driverAdapterError?: { cause?: unknown } };
    prismaError.meta = {
      ...pick(prismaError.meta, META_NAMES),
      ...(driverAdapterError && { driverAdapterError: { cause: pick(driverAdapterError.cause, ADAPTER_CAUSE_NAMES) } }),
    };
  }
  return prismaError;
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
