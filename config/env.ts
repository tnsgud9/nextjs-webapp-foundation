import { z } from "zod";

/**
 * The single entry point for public environment variables.
 *
 * App code never reads `process.env` directly; it uses `env` from this module.
 * A bad setting fails when the module loads, not deep inside the runtime.
 *
 * Note: Next.js replaces `process.env.NEXT_PUBLIC_*` with static text at build time.
 * Each variable must be written out in full as below; dynamic access such as
 * `process.env[key]` is undefined in the client bundle.
 */
const envSchema = z.object({
  /** Supabase project URL. Supabase is disabled when it is unset. */
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  /** Supabase publishable(anon) key. */
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1).optional(),
  /** Sentry DSN. Public because the browser reports errors too. Sentry is disabled when it is unset. */
  NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
});

const parsed = envSchema.safeParse({
  // Treat an empty string (`FOO=`) as unset so the default applies.
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
});

if (!parsed.success) {
  throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
}

export const env = {
  supabaseUrl: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  sentryDsn: parsed.data.NEXT_PUBLIC_SENTRY_DSN,
} as const;

/** Whether every Supabase variable is set. Without them, Supabase is skipped. */
export const hasSupabaseEnvVars = Boolean(
  env.supabaseUrl && env.supabasePublishableKey,
);
