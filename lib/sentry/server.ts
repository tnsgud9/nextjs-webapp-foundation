import "server-only";
import * as Sentry from "@sentry/nextjs";
import { serverEnv } from "@/config/env.server";
import { sentryOptions } from "./options";

/**
 * Sentry init for the server runtimes (Node and Edge), loaded once at server start by
 * `register()` in `instrumentation.ts`. `@sentry/nextjs` picks the SDK for each build target.
 *
 * Outgoing requests to the notification webhook are left out of spans and breadcrumbs: the SDK records a
 * request's URL path, and the webhook's secret is in its path.
 */
const webhook = serverEnv.notifySlackWebhookUrl;
const webhookPath = webhook === undefined ? undefined : new URL(webhook).origin + new URL(webhook).pathname;

Sentry.init({
  ...sentryOptions,
  ignoreSpans: webhookPath === undefined ? [] : [webhookPath],
  beforeBreadcrumb: (breadcrumb) =>
    webhookPath !== undefined && String(breadcrumb.data?.url ?? "").startsWith(webhookPath) ? null : breadcrumb,
});
