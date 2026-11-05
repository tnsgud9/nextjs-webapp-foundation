import "server-only";
import { type LogAttributes, logger } from "@/lib/server/logger";

/** Longest one request waits for Supabase Auth (signing keys, token refresh), retries included. */
export const AUTH_TIMEOUT_MS = 3_000;

export interface AuthDeadline {
  /** `fetch` for the Supabase client: aborts calls in flight, and any retry, once the time is up. */
  fetch: typeof fetch;
  /** Waits for `promise` until the time is up, then logs a warning and returns `fallback`. */
  run<T, F>(promise: Promise<T>, fallback: F, attributes?: LogAttributes): Promise<T | F>;
}

/**
 * A time limit for the Supabase Auth calls of one request. The SDK retries a failed token refresh
 * for up to 30 seconds, so without a limit a slow Auth server would hold every request that long.
 * The limit starts when the deadline is created. Give `fetch` only to a client used for auth,
 * because it limits every call that client makes.
 */
export function createAuthDeadline(timeoutMs: number = AUTH_TIMEOUT_MS): AuthDeadline {
  const signal = AbortSignal.timeout(timeoutMs);
  const expired = new Promise<"expired">((resolve) => {
    signal.addEventListener("abort", () => resolve("expired"), { once: true });
  });

  return {
    fetch: (input, init) =>
      fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, signal]) : signal }),
    async run(promise, fallback, attributes) {
      const settled = promise.then((value) => ({ value }));
      // A rejection after the time is up has no one waiting for it; keep it from going unhandled.
      settled.catch(() => {});
      const result = await Promise.race([settled, expired]);
      if (result !== "expired") return result.value;
      logger.warn("Supabase Auth did not answer in time", { ...attributes, "supabase.auth.timeout_ms": timeoutMs });
      return fallback;
    },
  };
}
