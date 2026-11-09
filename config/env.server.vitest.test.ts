import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { describe, expect, it } from "vitest";
import { name as packageName } from "@/package.json";
import { importWithEnv } from "@/test-utils/vitest/helpers";

const UNSET = {
  NODE_ENV: "production",
  DATABASE_URL: "",
  DATABASE_POOL_MAX: "",
  SERVICE_NAME: "",
  APP_ENV: "",
  NOTIFY_SLACK_WEBHOOK_URL: "",
  REDIS_URL: "",
};
const loadServerEnv = async (values: Record<string, string>) =>
  (await importWithEnv({ ...UNSET, ...values }, () => import("./env.server"))).serverEnv;

describe("server env", () => {
  it("loads with .env.example copied as is, so a fresh copy runs before any value is filled in", async () => {
    const example = parseEnv(readFileSync(".env.example", "utf8")) as Record<string, string>;
    await expect(loadServerEnv(example)).resolves.toBeDefined();
    await expect(importWithEnv(example, () => import("./env"))).resolves.toBeDefined();
  });

  it("treats empty values as unset and fills in the defaults", async () => {
    expect(await loadServerEnv({})).toEqual({
      databaseUrl: undefined,
      databasePoolMax: 3,
      serviceName: packageName,
      environment: "production",
      notifySlackWebhookUrl: undefined,
      redisUrl: undefined,
    });
  });

  it("reads each variable", async () => {
    const env = await loadServerEnv({
      DATABASE_URL: "postgresql://user:secret@db.example:6543/app",
      DATABASE_POOL_MAX: "10",
      SERVICE_NAME: "billing",
      APP_ENV: "staging",
      NOTIFY_SLACK_WEBHOOK_URL: "https://hooks.example/services/secret",
      REDIS_URL: "rediss://cache.example:6380",
    });
    expect(env).toMatchObject({ databasePoolMax: 10, serviceName: "billing", environment: "staging" });
    expect(env.redisUrl).toBe("rediss://cache.example:6380");
  });

  it.each(["1", "100"])("accepts DATABASE_POOL_MAX=%s", async (value) => {
    expect((await loadServerEnv({ DATABASE_POOL_MAX: value })).databasePoolMax).toBe(Number(value));
  });

  it.each([
    ["DATABASE_POOL_MAX", "0"],
    ["DATABASE_POOL_MAX", "101"],
    ["DATABASE_POOL_MAX", "2.5"],
    ["DATABASE_POOL_MAX", "many"],
    ["DATABASE_URL", "not a url"],
    ["NOTIFY_SLACK_WEBHOOK_URL", "http://hooks.example/services/secret"],
    ["REDIS_URL", "http://cache.example:6379"],
  ])("fails at load time on %s=%s", async (key, value) => {
    const error: unknown = await loadServerEnv({ [key]: value }).catch((caught: unknown) => caught);
    expect(String(error)).toMatch(/Invalid server environment variables/);
    expect(String(error)).toContain(`at ${key}`);
  });
});
