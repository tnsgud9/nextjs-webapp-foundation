import "client-only";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_COOKIE_OPTIONS, getSupabaseConfig } from "./config";

export function createClient() {
  const { url, publishableKey } = getSupabaseConfig();
  return createBrowserClient(url, publishableKey, { cookieOptions: SUPABASE_COOKIE_OPTIONS });
}
