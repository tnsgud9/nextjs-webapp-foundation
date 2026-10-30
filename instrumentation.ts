import * as Sentry from "@sentry/nextjs";

/**
 * Runs once when a server instance starts. Next.js looks for this file only at the project root,
 * so it holds just the entry point; the Sentry setup lives in `lib/sentry/`.
 */
export async function register() {
  await import("@/lib/sentry/server");
}

/**
 * Reports server errors that Next.js catches itself (Server Component rendering, unexpected Server
 * Action errors, and others). Route Handler errors are caught first by `lib/server/error-handlers.ts`,
 * never reach this hook, and are reported by `lib/server/error-mapper.ts` instead.
 */
export const onRequestError = Sentry.captureRequestError;
