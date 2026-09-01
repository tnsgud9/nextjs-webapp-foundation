import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_COOKIE_OPTIONS, getSupabaseConfig } from "./config";

/**
 * Don't put this client in a global variable. Always create a new client within each
 * function when using it.
 */
export async function createClient() {
  const { url, publishableKey } = getSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
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
