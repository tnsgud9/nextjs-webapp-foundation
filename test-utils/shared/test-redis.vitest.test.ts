import { createClient } from "redis";
import { describe, expect, it } from "vitest";
import { TEST_REDIS_URL, assertLocalRedis, resetRedis } from "./test-redis";

describe("assertLocalRedis", () => {
  it.each(["redis://localhost:6380", "redis://127.0.0.1", "rediss://[::1]:6380"])("allows %s", (url) =>
    expect(() => assertLocalRedis(url)).not.toThrow(),
  );

  it.each(["rediss://default:secret@cache.example.net:6379", "redis://redis.internal:6379"])("refuses %s", (url) =>
    expect(() => assertLocalRedis(url)).toThrow(/non-local/),
  );
});

describe("resetRedis", () => {
  it("empties the test Redis", async () => {
    const client = createClient({ url: TEST_REDIS_URL });
    await client.connect();
    try {
      await client.set("reset-probe", "1");
      await resetRedis(TEST_REDIS_URL);
      expect(await client.exists("reset-probe")).toBe(0);
    } finally {
      await client.close();
    }
  });
});
