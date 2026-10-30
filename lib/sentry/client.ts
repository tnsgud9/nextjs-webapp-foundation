import "client-only";
import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./options";

/**
 * Sentry init for the browser, loaded by the root `instrumentation-client.ts` before page code
 * runs. Next.js looks up the navigation hook among that file's exports, so it is re-exported there.
 */
Sentry.init(sentryOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
