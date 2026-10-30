import { afterAll, beforeAll } from "vitest";
import {
  type SessionClaims,
  type SessionOptions,
  fakeSupabaseEnv,
  sessionCookie,
  startFakeSupabaseAuth,
} from "@/test-utils/shared/supabase-auth";

/**
 * Starts and stops the fake Supabase Auth (test-utils/shared/supabase-auth.ts) per test file.
 * Call it at the top of a test file. Send the cookies it makes with `setRequestCookies()` (setup.ts).
 */
export interface FakeSupabaseAuth {
  /** Environment with `NEXT_PUBLIC_SUPABASE_*` pointing at this server. Pass it to `importWithEnv()`. */
  readonly env: Record<string, string>;
  /** A session cookie like the ones this server issues. */
  sessionCookie(claims: SessionClaims, options?: SessionOptions): { name: string; value: string };
}

/** Environment with Supabase turned off. */
export const SUPABASE_DISABLED_ENV = { NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" };

export function fakeSupabaseAuth(): FakeSupabaseAuth {
  let server: Awaited<ReturnType<typeof startFakeSupabaseAuth>> | undefined;
  beforeAll(async () => {
    server = await startFakeSupabaseAuth();
  });
  afterAll(() => server?.close());

  return {
    get env() {
      return fakeSupabaseEnv(server!.url);
    },
    sessionCookie: (claims, options) => sessionCookie(server!.url, claims, options),
  };
}
