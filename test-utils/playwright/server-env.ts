import { fakeSupabaseEnv } from "../shared/supabase-auth";
import { TEST_ENV } from "../shared/test-env";
import { FAKE_SUPABASE_URL } from "./supabase-auth";

/**
 * Environment of the app server Playwright builds and starts. `next build` / `next start` load `.env`, but never
 * override a variable that is already set, so the server gets every variable from `.env.test` (empty means unset)
 * and nothing from `.env`. Supabase points to the fake Auth server.
 */
export function playwrightServerEnv(): Record<string, string> {
  return { ...TEST_ENV, PLAYWRIGHT: "1", ...fakeSupabaseEnv(FAKE_SUPABASE_URL) };
}
