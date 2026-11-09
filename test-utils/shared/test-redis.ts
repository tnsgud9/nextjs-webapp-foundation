import { createClient } from "redis";
import { TEST_ENV } from "./test-env";

/**
 * The test Redis: `REDIS_URL` in `.env.test`, the Redis in docker-compose.test.yaml (CI starts a service container
 * at the same address). The one in .env is never used.
 */
export const TEST_REDIS_URL = TEST_ENV.REDIS_URL;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Tests empty Redis, so refuse to start against one that is not local. */
export function assertLocalRedis(url: string): void {
  const { hostname } = new URL(url);
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(`Refusing to use a non-local test Redis (${hostname}). REDIS_URL in .env.test must point to localhost.`);
  }
}

/** Empties the test Redis database. */
export async function resetRedis(url: string): Promise<void> {
  assertLocalRedis(url);
  const client = createClient({ url, socket: { connectTimeout: 1000, reconnectStrategy: false } });
  await client.connect();
  try {
    await client.flushDb();
  } finally {
    await client.close();
  }
}
