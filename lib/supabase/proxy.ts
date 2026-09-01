import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnvVars } from "@/config/env";
import { SUPABASE_COOKIE_OPTIONS, getSupabaseConfig } from "./config";

/**
 * Refreshes the Supabase session on every request. Called from the root `proxy.ts`.
 *
 * Server Components cannot write cookies, so they cannot refresh an expired access token.
 * The token is refreshed here and written to both the request cookies (read by the render
 * that follows) and the response cookies (stored by the browser).
 *
 * - It never redirects based on sign-in state. Each page, Server Action, and Route Handler
 *   checks access itself, because a changed proxy matcher could silently skip a route.
 * - Without the Supabase environment variables it does nothing.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  if (!hasSupabaseEnvVars) return response;

  const { url, publishableKey } = getSupabaseConfig();
  // Created per request so it is never shared between concurrent requests.
  const supabase = createServerClient(url, publishableKey, {
    cookieOptions: SUPABASE_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // Rebuild the response from the updated request cookies so the render sees the new token.
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // Headers (Cache-Control and others) that keep a CDN from caching auth cookies.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Put no code between createServerClient and this call; it causes random sign-outs.
  // getClaims() verifies the JWT and refreshes the token when needed.
  await supabase.auth.getClaims();

  // If you build a new response, copy these cookies onto it or the session is lost.
  return response;
}
