import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_COOKIE_OPTIONS, getSupabaseConfig } from "./config";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Create a new one in each function and never keep it in a global variable: one server
 * instance serves many requests at once, and a shared client would mix their sessions.
 *
 * `fetch` replaces the one the client uses for every call; `lib/auth.ts` passes a time-limited one.
 */
export async function createClient(options: { fetch?: typeof fetch } = {}) {
  const { url, publishableKey } = getSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    ...(options.fetch && { global: { fetch: options.fetch } }),
    cookieOptions: SUPABASE_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies. The root `proxy.ts`
          // (`lib/supabase/proxy.ts`) refreshes the session, so this can be ignored.
        }
      },
    },
  });
}
