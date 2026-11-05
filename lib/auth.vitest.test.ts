import { describe, expect, it, vi } from "vitest";
import { importWithEnv } from "@/test-utils/vitest/helpers";
import { loggedWarnings, setRequestCookies } from "@/test-utils/vitest/setup";
import { SUPABASE_DISABLED_ENV, fakeSupabaseAuth } from "@/test-utils/vitest/supabase-auth";

// A shorter Supabase Auth time limit, so the time-limit test does not wait three seconds.
const AUTH_LIMIT_MS = 300;
vi.mock("@/lib/supabase/auth-deadline", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/supabase/auth-deadline")>();
  return { ...original, createAuthDeadline: () => original.createAuthDeadline(AUTH_LIMIT_MS) };
});

const auth = fakeSupabaseAuth();
const loadAuth = (env = auth.env) => importWithEnv(env, () => import("./auth"));

const USER = { sub: "11111111-1111-1111-1111-111111111111", email: "user@example.com" };
const ANON = { sub: "22222222-2222-2222-2222-222222222222", is_anonymous: true };
const redirectTo = (path: string) => ({ digest: expect.stringContaining(`;${path};`) });

describe("getCurrentUser", () => {
  it("returns the verified requester for a validly signed token", async () => {
    setRequestCookies([auth.sessionCookie(USER)]);
    await expect((await loadAuth()).getCurrentUser()).resolves.toEqual({
      id: USER.sub,
      email: USER.email,
      isAnonymous: false,
    });
  });

  it.each([
    ["no session", () => []],
    ["a token signed with another key", () => [auth.sessionCookie(USER, { forged: true })]],
    ["a validly signed token that is not a user session", () => [auth.sessionCookie({ ...USER, role: "anon" })]],
    [
      "an expired token whose session was revoked",
      () => [auth.sessionCookie({ ...USER, expiresIn: -3600 }, { refreshable: false })],
    ],
  ])("returns null for %s", async (_name, cookies) => {
    setRequestCookies(cookies());
    await expect((await loadAuth()).getCurrentUser()).resolves.toBeNull();
  });

  it("refreshes an expired token and verifies the new one", async () => {
    setRequestCookies([auth.sessionCookie({ ...USER, expiresIn: -3600 })]);
    await expect((await loadAuth()).getCurrentUser()).resolves.toMatchObject({ id: USER.sub });
  });

  it("returns null and logs a warning when Supabase Auth does not answer in time", async () => {
    setRequestCookies([auth.sessionCookie({ ...USER, expiresIn: -3600 }, { unresponsive: true })]);
    await expect((await loadAuth()).getCurrentUser()).resolves.toBeNull();
    expect(loggedWarnings()).toEqual([
      expect.objectContaining({
        body: "Supabase Auth did not answer in time",
        "code.function.name": "getCurrentUser",
        "supabase.auth.timeout_ms": AUTH_LIMIT_MS,
      }),
    ]);
  });

  it("returns null when Supabase is not configured", async () => {
    setRequestCookies([auth.sessionCookie(USER)]);
    await expect((await loadAuth(SUPABASE_DISABLED_ENV)).getCurrentUser()).resolves.toBeNull();
  });
});

describe("requireUser", () => {
  it("returns a signed-in user and throws 401 for a forged token", async () => {
    setRequestCookies([auth.sessionCookie(USER)]);
    await expect((await loadAuth()).requireUser()).resolves.toMatchObject({ id: USER.sub });

    setRequestCookies([auth.sessionCookie(USER, { forged: true })]);
    await expect((await loadAuth()).requireUser()).rejects.toMatchObject({ name: "ProblemError", status: 401 });
  });

  it("rejects anonymous users unless allowed", async () => {
    setRequestCookies([auth.sessionCookie(ANON)]);
    const { requireUser } = await loadAuth();
    await expect(requireUser()).rejects.toMatchObject({ status: 401 });
    await expect(requireUser({ allowAnonymous: true })).resolves.toMatchObject({ id: ANON.sub, isAnonymous: true });
  });
});

describe("requirePageUser", () => {
  it("returns a signed-in user and redirects to the sign-in path otherwise", async () => {
    setRequestCookies([auth.sessionCookie(USER)]);
    await expect((await loadAuth()).requirePageUser()).resolves.toMatchObject({ id: USER.sub });

    setRequestCookies([]);
    const { requirePageUser, SIGN_IN_PATH } = await loadAuth();
    await expect(requirePageUser()).rejects.toMatchObject(redirectTo(SIGN_IN_PATH));
  });

  it("redirects anonymous users unless allowed", async () => {
    setRequestCookies([auth.sessionCookie(ANON)]);
    const { requirePageUser, SIGN_IN_PATH } = await loadAuth();
    await expect(requirePageUser()).rejects.toMatchObject(redirectTo(SIGN_IN_PATH));
    await expect(requirePageUser({ allowAnonymous: true })).resolves.toMatchObject({ isAnonymous: true });
  });
});
