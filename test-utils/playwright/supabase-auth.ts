import { LOOPBACK, type SessionClaims, type SessionOptions, sessionCookie } from "../shared/supabase-auth";

/**
 * Fake Supabase Auth for Playwright. `NEXT_PUBLIC_*` values are baked into the build, so it uses a
 * fixed port, and playwright.config.ts starts the server at this address before the app.
 */
export const FAKE_SUPABASE_PORT = 3101;
export const FAKE_SUPABASE_URL = `http://${LOOPBACK}:${FAKE_SUPABASE_PORT}`;

/** Name of the Supabase session cookie for this address (@supabase/ssr derives it from the host). */
export const SESSION_COOKIE_NAME = sessionCookie(FAKE_SUPABASE_URL, { sub: "" }).name;

/** Session cookie ready to put in a request's `cookie` header. */
export function sessionCookieHeader(claims: SessionClaims, options?: SessionOptions): string {
  const { name, value } = sessionCookie(FAKE_SUPABASE_URL, claims, options);
  return `${name}=${value}`;
}
