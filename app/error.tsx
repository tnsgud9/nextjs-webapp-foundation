"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

/**
 * Fallback for unexpected rendering errors. Handle expected failures (auth, permission, missing
 * target) in the page with `redirect()` / `notFound()` so they never reach this screen.
 *
 * The error itself is never shown. In production Next replaces Server Component errors with a
 * generic message and a `digest`, so only the `digest` is shown, to match against the server log.
 *
 * Errors with a `digest` were already reported on the server (`instrumentation.ts`); only
 * browser errors are sent to Sentry here.
 */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const digest =
    error instanceof Error && "digest" in error && typeof error.digest === "string"
      ? error.digest
      : undefined;

  useEffect(() => {
    if (!digest) Sentry.captureException(error);
  }, [error, digest]);

  return (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyTitle>Something went wrong</EmptyTitle>
        <EmptyDescription>
          We could not process your request. Please try again later.
          {digest && <span className="mt-2 block font-mono text-xs">Error code: {digest}</span>}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={() => retry()}>Try again</Button>
      </EmptyContent>
    </Empty>
  );
}
