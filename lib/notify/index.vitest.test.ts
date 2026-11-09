import { after } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { importWithEnv } from "@/test-utils/vitest/helpers";
import { loggedWarnings, sentNotifications } from "@/test-utils/vitest/setup";
import { defineNotification, notify as mockedNotify } from "@/lib/notify";

vi.mock("next/server", () => ({ after: vi.fn() }));

/** The real module (setup.ts mocks `@/lib/notify` for every other test), loaded with these variables. */
const loadNotify = (env: Record<string, string> = {}) =>
  importWithEnv(env, () => vi.importActual<typeof import("./index")>("./index"));

/** Runs the callbacks `notify()` passed to `after()`, as Next.js does once the response is finished. */
const runAfterCallbacks = () => Promise.all(vi.mocked(after).mock.calls.map(([task]) => (task as () => unknown)()));

const Hello = defineNotification("hello", { topic: "ops", render: ({ name }: { name: string }) => ({ title: `Hello ${name}` }) });

describe("notify", () => {
  it("sends only after the response, to the default webhook", async () => {
    const requests: { url: string; body: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        requests.push({ url: request.url, body: await request.clone().text() });
        return new Response("ok");
      }),
    );
    const { notify } = await loadNotify({ NOTIFY_SLACK_WEBHOOK_URL: "https://hooks.test/services/secret" });

    notify(Hello, { name: "team" });
    expect(requests).toEqual([]);
    expect(await runAfterCallbacks()).toEqual([true]);
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("https://hooks.test/services/secret");
    expect(JSON.parse(requests[0].body)).toMatchObject({ text: "Hello team" });
  });

  it("sends nothing and warns when no webhook is configured", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { sendNotification } = await loadNotify();

    expect(await sendNotification(Hello, { name: "team" })).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    expect(loggedWarnings()).toMatchObject([{ body: "Notification skipped: no destination configured", "notify.kind": "hello" }]);
  });

  it("rejects a webhook URL that is not https", async () => {
    await expect(loadNotify({ NOTIFY_SLACK_WEBHOOK_URL: "http://hooks.test/services/secret" })).rejects.toThrow(
      /NOTIFY_SLACK_WEBHOOK_URL/,
    );
  });
});

describe("the global test mock", () => {
  it("records each kind and its data instead of sending", () => {
    mockedNotify(Hello, { name: "team" });
    expect(sentNotifications()).toEqual([{ kind: "hello", data: { name: "team" } }]);
  });
});
