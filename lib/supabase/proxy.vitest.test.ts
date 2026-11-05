import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { importWithEnv } from "@/test-utils/vitest/helpers";
import { loggedWarnings } from "@/test-utils/vitest/setup";
import { fakeSupabaseAuth } from "@/test-utils/vitest/supabase-auth";

// A shorter Supabase Auth time limit, so the time-limit test does not wait three seconds.
const AUTH_LIMIT_MS = 300;
vi.mock("./auth-deadline", async (importOriginal) => {
  const original = await importOriginal<typeof import("./auth-deadline")>();
  return { ...original, createAuthDeadline: () => original.createAuthDeadline(AUTH_LIMIT_MS) };
});

const auth = fakeSupabaseAuth();
const USER = { sub: "11111111-1111-1111-1111-111111111111", expiresIn: -3600 };

async function refresh(cookie: { name: string; value: string }, env: Record<string, string> = {}) {
  const { updateSession } = await importWithEnv({ ...auth.env, ...env }, () => import("./proxy"));
  const request = new NextRequest("http://test/items", {
    headers: { cookie: `${cookie.name}=${cookie.value}`, "x-request-id": "req-1" },
  });
  return updateSession(request);
}

describe("updateSession", () => {
  it("refreshes an expired session and sets the new cookies on the response", async () => {
    const response = await refresh(auth.sessionCookie(USER));
    expect(response.cookies.getAll().length).toBeGreaterThan(0);
    expect(loggedWarnings()).toEqual([]);
  });

  it("marks the session cookies Secure in production builds only", async () => {
    const production = await refresh(auth.sessionCookie(USER), { NODE_ENV: "production" });
    expect(production.cookies.getAll().length).toBeGreaterThan(0);
    for (const cookie of production.cookies.getAll()) expect(cookie.secure, cookie.name).toBe(true);

    const test = await refresh(auth.sessionCookie(USER), { NODE_ENV: "test" });
    for (const cookie of test.cookies.getAll()) expect(cookie.secure, cookie.name).toBeFalsy();
  });

  it("goes on with the cookies it got when Supabase Auth does not answer in time", async () => {
    const response = await refresh(auth.sessionCookie(USER, { unresponsive: true }));
    expect(response.cookies.getAll()).toEqual([]);
    expect(loggedWarnings()).toEqual([
      expect.objectContaining({
        body: "Supabase Auth did not answer in time",
        "code.function.name": "updateSession",
        "request.id": "req-1",
      }),
    ]);
  });
});
