/**
 * Runs once when a server instance starts. Next.js looks for this file only at the project root,
 * so it holds just the entry points; the Sentry setup lives in `lib/sentry/`.
 */
export async function register() {
  await import("@/lib/sentry/server");
}

/**
 * Logs and reports server errors that Next.js catches itself (Server Component rendering, unexpected
 * Server Action errors, the proxy). Route Handler errors are caught first by `lib/server/error-handlers.ts`,
 * never reach this hook, and are handled by `lib/server/error-mapper.ts` instead.
 */
export { onRequestError } from "@/lib/server/request-errors";
