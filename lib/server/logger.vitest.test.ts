import { describe, expect, it, vi } from "vitest";
import { name as packageName } from "@/package.json";
import { importWithEnv } from "@/test-utils/vitest/helpers";
import { loggedErrors } from "@/test-utils/vitest/setup";

const UNSET = { NODE_ENV: "production", SERVICE_NAME: "", APP_ENV: "" };
const loadLogger = async (env: Record<string, string> = {}) =>
  (await importWithEnv({ ...UNSET, ...env }, () => import("./logger"))).logger;

describe("logger", () => {
  it("writes one JSON line with the fixed OpenTelemetry fields", async () => {
    (await loadLogger({ SERVICE_NAME: "billing" })).error("Something failed", { "request.id": "req-1" });

    expect(console.error).toHaveBeenCalledTimes(1);
    const line = String(vi.mocked(console.error).mock.calls[0]?.[0]);
    expect(line).not.toContain("\n");
    expect(loggedErrors()[0]).toEqual({
      timestamp: expect.stringMatching(/^\d{4}-\d\d-\d\dT.*Z$/),
      severity_text: "ERROR",
      body: "Something failed",
      "service.name": "billing",
      "deployment.environment.name": "production",
      "request.id": "req-1",
    });
  });

  it("names the service after package.json and the environment after APP_ENV, then NODE_ENV", async () => {
    const env = async (values: Record<string, string>) => {
      vi.mocked(console.error).mockClear();
      (await loadLogger(values)).error("x");
      return loggedErrors()[0];
    };
    expect(await env({})).toMatchObject({ "service.name": packageName, "deployment.environment.name": "production" });
    expect(await env({ APP_ENV: "staging" })).toMatchObject({ "deployment.environment.name": "staging" });
  });

  it("writes info and warn to their own console methods", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logger = await loadLogger();
    logger.info("started");
    logger.warn("slow");
    expect(JSON.parse(String(info.mock.calls[0]?.[0]))).toMatchObject({ severity_text: "INFO", body: "started" });
    expect(JSON.parse(String(warn.mock.calls[0]?.[0]))).toMatchObject({ severity_text: "WARN", body: "slow" });
  });

  it("keeps the fixed fields from being overwritten", async () => {
    (await loadLogger()).error("real", { body: "fake", severity_text: "INFO", "service.name": "other" });
    expect(loggedErrors()[0]).toMatchObject({ body: "real", severity_text: "ERROR", "service.name": packageName });
  });

  it("redacts secret and personal keys at any depth", async () => {
    (await loadLogger()).error("x", {
      accessToken: "t",
      user: { email: "a@b.c", id: "u1", nested: { password: "p", Cookie: "c" } },
      "http.request.header.authorization": "Bearer t",
      sessionId: "s",
      apiKey: "k",
    });
    const record = loggedErrors()[0];
    expect(record).toMatchObject({
      accessToken: "[REDACTED]",
      user: { email: "[REDACTED]", id: "u1", nested: { password: "[REDACTED]", Cookie: "[REDACTED]" } },
      "http.request.header.authorization": "[REDACTED]",
      sessionId: "[REDACTED]",
      apiKey: "[REDACTED]",
    });
    expect(JSON.stringify(record)).not.toMatch(/a@b\.c|Bearer/);
  });

  it("turns the exception into type, message, stack trace with causes, and Next's digest", async () => {
    const error = Object.assign(new Error("outer", { cause: new TypeError("inner") }), { digest: "42" });
    (await loadLogger()).error("x", { exception: error });
    const record = loggedErrors()[0];
    expect(record).toMatchObject({ "exception.type": "Error", "exception.message": "outer", "next.digest": "42" });
    expect(record?.["exception.stacktrace"]).toMatch(/Error: outer[\s\S]*Caused by: TypeError: inner/);
  });

  it("logs a thrown non-Error value and cuts long stack traces", async () => {
    const logger = await loadLogger();
    logger.error("x", { exception: "boom" });
    const long = new Error("long");
    long.stack = "s".repeat(50_000);
    logger.error("y", { exception: long });
    const [first, second] = loggedErrors();
    expect(first).toMatchObject({ "exception.type": "string", "exception.message": "boom" });
    expect(String(second?.["exception.stacktrace"]).length).toBe(16_000);
  });

  it("never throws, even on circular, bigint, or throwing values", async () => {
    const logger = await loadLogger();
    const circular: Record<string, unknown> = { id: BigInt(1) };
    circular.self = circular;
    logger.error("circular", { circular });
    expect(loggedErrors()[0]).toMatchObject({ circular: { id: "1", self: "[Circular]" } });

    const hostile = {
      get boom() {
        throw new Error("getter");
      },
    };
    vi.mocked(console.error).mockClear();
    expect(() => logger.error("hostile", { hostile })).not.toThrow();
    expect(console.error).toHaveBeenCalledWith("hostile");
  });
});
