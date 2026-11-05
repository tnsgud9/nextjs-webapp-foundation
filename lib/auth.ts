import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { hasSupabaseEnvVars } from "@/config/env";
import { ProblemError } from "@/lib/problem";
import { REQUEST_ID_HEADER } from "@/lib/server/logger";
import { createAuthDeadline } from "@/lib/supabase/auth-deadline";
import { createClient } from "@/lib/supabase/server";

/**
 * The single entry point for identifying the requester on the server. The DAL (`data/`), Server
 * Actions, and Route Handlers never trust cookies or a user ID sent by the client; they go through this module.
 *
 * - `getClaims()` verifies the access token signature. `getSession()` only reads the cookie and
 *   can return forged values, so it is never used for auth decisions.
 * - Verification runs once per request, however often it is called (`React.cache`).
 * - Supabase Auth gets a time limit (`lib/supabase/auth-deadline.ts`). Past it, the requester
 *   counts as not signed in, like any other failed verification.
 * - Authorization (may this user access this resource?) is not decided here; the DAL checks it per resource.
 */

/** The minimal requester information that is safe to pass to the client. */
export interface AuthUser {
  id: string;
  email?: string;
  /** Whether this is a Supabase anonymous user. */
  isAnonymous: boolean;
}

/** The signed-in requester, or `null` when not signed in or Supabase is not configured. */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  if (!hasSupabaseEnvVars) return null;

  const deadline = createAuthDeadline();
  const supabase = await createClient({ fetch: deadline.fetch });
  const result = await deadline.run(supabase.auth.getClaims(), null, {
    "code.function.name": "getCurrentUser",
    "request.id": (await headers()).get(REQUEST_ID_HEADER) ?? undefined,
  });
  if (!result || result.error || !result.data) return null;

  const { claims } = result.data;
  // Only a user's session counts. Project API keys are signed tokens too, but their role is anon or service_role.
  if (claims.role !== "authenticated") return null;
  return {
    id: claims.sub,
    email: claims.email,
    isAnonymous: claims.is_anonymous ?? false,
  };
});

/**
 * Returns the signed-in requester, or throws a 401 ProblemError.
 * The Route Handler and Server Action error handlers turn it into a 401 Problem.
 *
 * Supabase anonymous users are rejected by default, even with a validly signed token.
 * Turn on `allowAnonymous` explicitly only for features meant for anonymous users.
 */
export async function requireUser(options?: { allowAnonymous?: boolean }): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!isAllowed(user, options)) throw new ProblemError(401, "Sign-in required.");
  return user;
}

/**
 * Path of the sign-in page. Create the page in your project and set this to match.
 * If you pass a return address in the query, the sign-in page must verify that it is a
 * same-origin relative path, or it becomes an open redirect.
 */
export const SIGN_IN_PATH = "/login";

/**
 * `requireUser()` for pages (Server Components). Redirects to `SIGN_IN_PATH` instead of showing an
 * error when not signed in. In a page, the 401 from `requireUser()` is treated as an unexpected error
 * and shows `error.tsx`, so pages use this function.
 */
export async function requirePageUser(options?: { allowAnonymous?: boolean }): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!isAllowed(user, options)) redirect(SIGN_IN_PATH);
  return user;
}

function isAllowed(
  user: AuthUser | null,
  options?: { allowAnonymous?: boolean },
): user is AuthUser {
  return user !== null && (!user.isAnonymous || options?.allowAnonymous === true);
}
