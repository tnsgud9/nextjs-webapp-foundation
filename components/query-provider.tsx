"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getQueryClient } from "@/lib/query-client";

/**
 * Global TanStack Query provider, mounted in the root layout.
 *
 * `getQueryClient()` is called during render without useState. It returns a new instance per
 * request on the server and a singleton in the browser, so this call alone is correct
 * (the official TanStack App Router pattern).
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
