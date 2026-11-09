import { describe, expect, it } from "vitest";
import { importWithEnv } from "@/test-utils/vitest/helpers";
import { loggedWarnings } from "@/test-utils/vitest/setup";
import { TEST_REDIS_URL } from "@/test-utils/shared/test-redis";

/** Runs in the `db` project, against the test Redis. */
const loadClient = (redisUrl: string) => importWithEnv({ REDIS_URL: redisUrl }, () => import("./client"));

describe("Redis client", () => {
  it("is absent when Redis is not configured, so the app runs without it", async () => {
    const { getRedis, hasRedis } = await loadClient("");
    expect(hasRedis).toBe(false);
    expect(await getRedis()).toBeUndefined();
  });

  it("connects on first use and reuses the connection", async () => {
    const { getRedis, hasRedis } = await loadClient(TEST_REDIS_URL);
    expect(hasRedis).toBe(true);
    const client = await getRedis();
    try {
      expect(await getRedis()).toBe(client);
      await client!.set("probe", "1", { EX: 10 });
      expect(await client!.get("probe")).toBe("1");
    } finally {
      await client!.close();
      // Outside production the client is kept on globalThis; drop the closed one.
      delete (globalThis as { redis?: unknown }).redis;
    }
  });

  it("rejects when the server cannot be reached, and tries again on the next call", async () => {
    const { getRedis } = await loadClient("redis://127.0.0.1:1");
    await expect(getRedis()).rejects.toThrow();
    await expect(getRedis()).rejects.toThrow();
    expect(JSON.stringify(loggedWarnings())).not.toContain("127.0.0.1");
  });
});
