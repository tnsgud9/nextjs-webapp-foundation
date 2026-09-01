import { env, hasSupabaseEnvVars } from "@/config/env";

/**
 * Options for the session cookies every Supabase client writes (server, proxy, browser), on top of the library's
 * defaults. Production builds mark them `Secure`, so the browser sends them only over HTTPS (or to localhost).
 */
export const SUPABASE_COOKIE_OPTIONS = { secure: process.env.NODE_ENV === "production" };

/**
 * Returns the URL and key needed to create a Supabase client.
 *
 * The Supabase variables are optional (`config/env.ts`), so creating a client without them
 * fails here with a clear message instead of an obscure runtime error.
 * Code that behaves differently without Supabase checks `hasSupabaseEnvVars` first.
 */
export function getSupabaseConfig(): { url: string; publishableKey: string } {
  if (!hasSupabaseEnvVars) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. See .env.example.",
    );
  }
  return { url: env.supabaseUrl!, publishableKey: env.supabasePublishableKey! };
}
