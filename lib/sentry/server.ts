import "server-only";
import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./options";

/**
 * Sentry init for the server runtimes (Node and Edge), loaded once at server start by
 * `register()` in `instrumentation.ts`. `@sentry/nextjs` picks the SDK for each build target.
 */
Sentry.init(sentryOptions);
