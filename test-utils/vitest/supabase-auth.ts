import { afterAll, beforeAll } from "vitest";
import {
  type SessionClaims,
  type SessionOptions,
  fakeSupabaseEnv,
  sessionCookie,
  startFakeSupabaseAuth,
} from "@/test-utils/shared/supabase-auth";
import { importWithEnv } from "./helpers";
import { setRequestCookies } from "./setup";

/**
 * Starts and stops the fake Supabase Auth (test-utils/shared/supabase-auth.ts) per test file.
 * Call it at the top of a test file.
 *
 * Supabase is off in the test environment (`.env.test`), and whether it is on is fixed when a module loads, so
 * load the module under test with `load()` rather than a static import; a static import sees no Supabase and
 * every caller as signed out. Then `signIn()` makes the requester a user for the rest of the test.
 */
export interface FakeSupabaseAuth {
  /** Environment with `NEXT_PUBLIC_SUPABASE_*` pointing at this server. Pass it to `importWithEnv()`. */
  readonly env: Record<string, string>;
  /** A session cookie like the ones this server issues. */
  sessionCookie(claims: SessionClaims, options?: SessionOptions): { name: string; value: string };
  /** Loads a module (a `data/` file, `lib/auth`, …) with Supabase pointing at this server. */
  load<T>(importer: () => Promise<T>): Promise<T>;
  /** Signs the requester in as the user in `claims` (a validly signed, refreshable session). */
  signIn(claims: SessionClaims, options?: SessionOptions): void;
  /** Signs the requester out. */
  signOut(): void;
}

/** Environment with Supabase turned off. */
export const SUPABASE_DISABLED_ENV = { NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" };

export function fakeSupabaseAuth(): FakeSupabaseAuth {
  let server: Awaited<ReturnType<typeof startFakeSupabaseAuth>> | undefined;
  beforeAll(async () => {
    server = await startFakeSupabaseAuth();
  });
  afterAll(() => server?.close());

  const auth: FakeSupabaseAuth = {
    get env() {
      return fakeSupabaseEnv(server!.url);
    },
    sessionCookie: (claims, options) => sessionCookie(server!.url, claims, options),
    load: (importer) => importWithEnv(auth.env, importer),
    signIn: (claims, options) => setRequestCookies([auth.sessionCookie(claims, options)]),
    signOut: () => setRequestCookies([]),
  };
  return auth;
}
