import { describe, expect, it } from "vitest";
import { importWithEnv } from "@/test-utils/vitest/helpers";

const loadOptions = (dsn: string) =>
  importWithEnv({ NEXT_PUBLIC_SENTRY_DSN: dsn }, () => import("./options")).then((module) => module.sentryOptions);

describe("shared Sentry options", () => {
  it("are off without a DSN, so nothing is sent by default", async () => {
    const options = await loadOptions("");
    expect(options.enabled).toBe(false);
    expect(options.dsn).toBeUndefined();
  });

  it("turn on with a DSN", async () => {
    const options = await loadOptions("https://public@errors.example/1");
    expect(options.enabled).toBe(true);
    expect(options.dsn).toBe("https://public@errors.example/1");
  });

  it("collect no user info, cookies, headers, bodies, or query parameters", async () => {
    const options = await loadOptions("https://public@errors.example/1");
    expect(options.dataCollection).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    });
  });

  it("only sample performance traces", async () => {
    const options = await loadOptions("https://public@errors.example/1");
    expect(options.tracesSampleRate).toBeGreaterThan(0);
    expect(options.tracesSampleRate).toBeLessThan(1);
  });
});
