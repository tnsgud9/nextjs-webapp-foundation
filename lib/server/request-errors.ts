import "server-only";
import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";
import { logger, REQUEST_ID_HEADER } from "./logger";

/**
 * Next's `onRequestError` hook (re-exported by the root `instrumentation.ts`): server errors outside
 * Route Handlers, from Server Components, Server Actions, and the proxy. Each one is written to the
 * structured log and reported to Sentry. The log carries Next's `digest`, the code the error page shows.
 * Only the path is logged, never the query string.
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const requestId = request.headers[REQUEST_ID_HEADER];
  logger.error("Unhandled error in a request", {
    exception: error,
    "request.id": Array.isArray(requestId) ? requestId[0] : requestId,
    "http.request.method": request.method,
    "url.path": request.path.split("?")[0],
    "next.route_type": context.routeType,
    "next.route_path": context.routePath,
  });
  return Sentry.captureRequestError(error, request, context);
};
