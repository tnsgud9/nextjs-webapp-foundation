import type { Breadcrumb, NodeOptions } from "@sentry/nextjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { importWithEnv } from "@/test-utils/vitest/helpers";

const WEBHOOK = "https://hooks.example/services/T000/B000/secret";

/** Loads lib/sentry/server.ts against a stand-in SDK and returns the options it passed to init(). */
async function loadOptions(webhook: string): Promise<NodeOptions> {
  const init = vi.fn();
  vi.doMock("@sentry/nextjs", () => ({ init }));
  await importWithEnv({ NOTIFY_SLACK_WEBHOOK_URL: webhook }, () => import("./server"));
  expect(init).toHaveBeenCalledOnce();
  return init.mock.calls[0][0];
}

const fetchCrumb = (url: string): Breadcrumb => ({ category: "fetch", data: { method: "POST", url } });

afterEach(() => {
  vi.doUnmock("@sentry/nextjs");
});

describe("server Sentry setup", () => {
  it("leaves the notification webhook, whose secret is in its path, out of spans and breadcrumbs", async () => {
    const options = await loadOptions(WEBHOOK);
    expect(options.ignoreSpans).toEqual([WEBHOOK]);
    expect(options.beforeBreadcrumb?.(fetchCrumb(WEBHOOK))).toBeNull();
    const other = fetchCrumb("https://api.example/v1/items");
    expect(options.beforeBreadcrumb?.(other)).toBe(other);
  });

  it("filters nothing when no webhook is set", async () => {
    const options = await loadOptions("");
    expect(options.ignoreSpans).toEqual([]);
    const crumb = fetchCrumb(WEBHOOK);
    expect(options.beforeBreadcrumb?.(crumb)).toBe(crumb);
  });
});
