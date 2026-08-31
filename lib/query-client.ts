import { QueryClient, environmentManager } from "@tanstack/react-query";
import { HTTPError } from "ky";

/**
 * TanStack Query client (Next.js App Router).
 *
 * Next.js also renders on the server, where a module-level singleton would share the cache
 * between requests. This returns a new client per request on the server and a singleton in
 * the browser (the official TanStack App Router pattern).
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // A remount within 60 seconds uses the cache without a network request.
        staleTime: 1000 * 60,
        retry: retryUnlessClientError,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/**
 * A 4xx answers the same on retry; retrying only delays the response the UI branches on.
 * Only 5xx and network errors are retried, once.
 * (ky uses `retry: 0`, so this layer alone owns the retry policy.)
 */
function retryUnlessClientError(failureCount: number, error: unknown): boolean {
  if (error instanceof HTTPError) {
    const { status } = error.response;
    if (status >= 400 && status < 500) return false;
  }
  return failureCount < 1;
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  // Server: a new instance per request (no cache shared between requests).
  if (environmentManager.isServer()) return makeQueryClient();
  // Browser: a singleton (so re-renders do not recreate the client).
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
