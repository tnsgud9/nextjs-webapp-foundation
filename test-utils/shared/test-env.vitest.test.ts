import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TEST_ENV } from "./test-env";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const exampleKeys = [...readFileSync(".env.example", "utf8").matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map((match) => match[1]);

describe("test environment (.env.test)", () => {
  it("lists exactly the variables in .env.example, so .env fills in none", () => {
    expect(Object.keys(TEST_ENV).sort()).toEqual([...exampleKeys].sort());
  });

  it("points only at this machine", () => {
    for (const [key, value] of Object.entries(TEST_ENV)) {
      if (!value.includes("://")) continue;
      expect(LOCAL_HOSTS.has(new URL(value).hostname), `${key} is not local`).toBe(true);
    }
  });

  it("turns off outside services", () => {
    expect(TEST_ENV).toMatchObject({ NOTIFY_SLACK_WEBHOOK_URL: "", SENTRY_AUTH_TOKEN: "" });
  });

  it("is the environment of every Vitest test", () => {
    for (const [key, value] of Object.entries(TEST_ENV)) expect(process.env[key], key).toBe(value);
  });
});
