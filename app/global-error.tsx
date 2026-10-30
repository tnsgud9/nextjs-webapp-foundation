"use client";

import "./globals.css";

/**
 * Fallback for when the root layout itself fails. It replaces the root layout, so it renders its own
 * `<html>` / `<body>` and relies on none of the layout's providers or theme; the font comes with globals.css.
 * The error itself is never shown, only the `digest` to match against the server log.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest =
    error instanceof Error && "digest" in error && typeof error.digest === "string"
      ? error.digest
      : undefined;

  return (
    <html lang="en">
      <body className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <title>Something went wrong</title>
        <h1 className="text-lg font-medium">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          We could not process your request. Please try again later.
          {digest && <span className="mt-2 block font-mono text-xs">Error code: {digest}</span>}
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-md border px-4 py-2 text-sm font-medium"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
