import { describe, expect, it } from "vitest";
import { loggedWarnings } from "@/test-utils/vitest/setup";
import { fakeSupabaseAuth } from "@/test-utils/vitest/supabase-auth";
import { AUTH_TIMEOUT_MS, createAuthDeadline } from "./auth-deadline";

const auth = fakeSupabaseAuth();
const LIMIT = 100;
const never = () => new Promise<never>(() => {});

describe("createAuthDeadline", () => {
  it("limits a request to three seconds by default", () => {
    expect(AUTH_TIMEOUT_MS).toBe(3_000);
  });

  it("returns the result when it arrives in time, without logging", async () => {
    await expect(createAuthDeadline(LIMIT).run(Promise.resolve("claims"), null)).resolves.toBe("claims");
    expect(loggedWarnings()).toEqual([]);
  });

  it("passes on a failure that arrives in time", async () => {
    const failure = new Error("boom");
    await expect(createAuthDeadline(LIMIT).run(Promise.reject(failure), null)).rejects.toBe(failure);
  });

  it("stops waiting at the limit, returns the fallback, and logs a warning", async () => {
    const started = Date.now();
    const result = await createAuthDeadline(LIMIT).run(never(), null, { "request.id": "req-1" });

    expect(result).toBeNull();
    expect(Date.now() - started).toBeLessThan(LIMIT + 1_000);
    expect(loggedWarnings()).toEqual([
      expect.objectContaining({
        severity_text: "WARN",
        body: "Supabase Auth did not answer in time",
        "request.id": "req-1",
        "supabase.auth.timeout_ms": LIMIT,
      }),
    ]);
  });

  it("aborts fetch calls in flight and any made after the limit", async () => {
    const { fetch } = createAuthDeadline(LIMIT);
    const refresh = () =>
      fetch(`${auth.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        body: JSON.stringify({ refresh_token: "unresponsive" }),
      });

    await expect(refresh()).rejects.toMatchObject({ name: "TimeoutError" });
    await expect(refresh()).rejects.toMatchObject({ name: "TimeoutError" });
  });
});
