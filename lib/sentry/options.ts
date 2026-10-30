import { env } from "@/config/env";

/**
 * Sentry init options shared by the browser, Node, and Edge runtimes.
 *
 * - Disabled without a DSN, so nothing is sent by default.
 * - Data collection is kept minimal. The SDK defaults send user IP and ID, cookies, HTTP
 *   headers and bodies, and query parameters; turn on only what debugging needs.
 * - The goal is error reporting, so performance tracing is only sampled.
 */
export const sentryOptions = {
  dsn: env.sentryDsn,
  enabled: Boolean(env.sentryDsn),
  tracesSampleRate: 0.1,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
  },
};
