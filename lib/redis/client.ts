import "server-only";
import { createClient } from "redis";
import { serverEnv } from "@/config/env.server";
import { logger } from "@/lib/server/logger";

/**
 * The single Redis client (server-only), imported only by the data access layer (`data/`), like `lib/db.ts`.
 *
 * - Redis is optional. Without `REDIS_URL`, `getRedis()` resolves to `undefined` and each `data/`
 *   function decides what to do without it, so the app runs with or without Redis.
 * - Redis is the app's cache: it holds only data the app can rebuild from its source or afford to lose, and
 *   any key can disappear. Every key belongs to a Redis model (`lib/redis/model.ts`). Data that must last
 *   belongs in the database.
 * - It connects on first use, so builds and code paths that never use Redis open no connection.
 * - It fails fast: a command waits at most `COMMAND_TIMEOUT_MS`, and while the connection is down
 *   commands fail at once instead of queueing, so callers can choose what to do without Redis.
 * - Connection errors are logged without their message, which can carry the URL. A failed first
 *   connection rejects at once; once connected, a dropped connection reconnects, backing off up to
 *   two seconds.
 * - In development the client lives on globalThis so HMR re-evaluation does not open more connections.
 */
const CONNECT_TIMEOUT_MS = 1000;
const COMMAND_TIMEOUT_MS = 500;

function createRedisClient(url: string) {
  // Until the first connection succeeds, a failure ends the attempt (connect() rejects) instead of
  // retrying forever; after that, a dropped connection reconnects with backoff.
  let connectedOnce = false;
  const client = createClient({
    url,
    disableOfflineQueue: true,
    commandOptions: { timeout: COMMAND_TIMEOUT_MS },
    socket: {
      connectTimeout: CONNECT_TIMEOUT_MS,
      reconnectStrategy: (retries) => (connectedOnce ? Math.min(100 * 2 ** retries, 2000) : false),
    },
  });
  client.once("ready", () => {
    connectedOnce = true;
  });
  return client;
}

export type RedisClient = ReturnType<typeof createRedisClient>;

/** Whether Redis is configured (`REDIS_URL`). */
export const hasRedis = serverEnv.redisUrl !== undefined;

const globalForRedis = globalThis as unknown as { redis?: { url: string; client: Promise<RedisClient> } };

async function connect(url: string): Promise<RedisClient> {
  const client = createRedisClient(url);
  // Without a listener, an error event would crash the process.
  client.on("error", (error: unknown) => {
    logger.warn("Redis connection error", { "error.type": error instanceof Error ? error.name : typeof error });
  });
  await client.connect();
  return client;
}

let pending: Promise<RedisClient> | undefined =
  globalForRedis.redis?.url === serverEnv.redisUrl ? globalForRedis.redis?.client : undefined;

/**
 * The connected client, or `undefined` when Redis is not configured. The first call connects, and
 * rejects if the server cannot be reached; a failed first connection is retried on the next call.
 */
export function getRedis(): Promise<RedisClient | undefined> {
  const url = serverEnv.redisUrl;
  if (url === undefined) return Promise.resolve(undefined);
  if (!pending) {
    pending = connect(url).catch((error: unknown) => {
      pending = undefined;
      globalForRedis.redis = undefined;
      throw error;
    });
    if (process.env.NODE_ENV !== "production") globalForRedis.redis = { url, client: pending };
  }
  return pending;
}
