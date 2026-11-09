import { describe, expect, it, vi } from "vitest";
import { loggedErrors, loggedWarnings } from "@/test-utils/vitest/setup";
import { defineNotification } from "./kind";
import { createNotifier } from "./notifier";
import { createSlackProvider } from "./providers/slack";
import type { NotifyProvider } from "./types";

const fakeProvider = (send: NotifyProvider["send"] = async () => {}): NotifyProvider => ({ name: "fake", send: vi.fn(send) });

const ImportFinished = defineNotification("import-finished", {
  topic: "ops",
  render: (data: { rows: number }) => ({ title: "Import finished", fields: [{ label: "Rows", value: String(data.rows) }] }),
});

describe("notifier", () => {
  it("renders the kind's data and sends it through the provider for the kind's topic", async () => {
    const provider = fakeProvider();
    const resolve = vi.fn(() => provider);
    expect(await createNotifier(resolve).send(ImportFinished, { rows: 3 })).toBe(true);
    expect(resolve).toHaveBeenCalledWith("ops");
    expect(provider.send).toHaveBeenCalledWith(
      { title: "Import finished", fields: [{ label: "Rows", value: "3" }] },
      { kind: "import-finished", topic: "ops" },
    );
  });

  it("skips a topic with no destination, and warns once per topic", async () => {
    const Other = defineNotification("other-event", { topic: "other", render: () => ({ title: "x" }) });
    const { send } = createNotifier(() => undefined);
    expect(await send(ImportFinished, { rows: 1 })).toBe(false);
    await send(ImportFinished, { rows: 2 });
    await send(Other, {});
    expect(loggedWarnings().map((record) => record["notify.topic"])).toEqual(["ops", "other"]);
  });

  it("logs a failed send or render instead of throwing", async () => {
    const Broken = defineNotification("broken", {
      topic: "ops",
      render: (): never => {
        throw new RangeError("bad data");
      },
    });
    const { send } = createNotifier(() => fakeProvider(async () => Promise.reject(new TypeError("boom"))));
    expect(await send(ImportFinished, { rows: 1 })).toBe(false);
    expect(await send(Broken, {})).toBe(false);
    expect(loggedErrors()).toMatchObject([
      { body: "Notification failed", "notify.kind": "import-finished", "notify.provider": "fake", "error.type": "TypeError" },
      { body: "Notification failed", "notify.kind": "broken", "error.type": "RangeError" },
    ]);
  });

  it("never logs the error message, which can carry the webhook URL", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no_service", { status: 404 })));
    const { send } = createNotifier(() => createSlackProvider("https://hooks.test/services/secret"));
    expect(await send(ImportFinished, { rows: 1 })).toBe(false);
    const [record] = loggedErrors();
    expect(record).toMatchObject({ "notify.provider": "slack", "error.type": "404", "http.response.status_code": 404 });
    expect(JSON.stringify(record)).not.toContain("hooks.test");
  });
});

describe("defineNotification", () => {
  it("takes only a flat DTO as data (checked by the type checker)", () => {
    interface Flat {
      id: string;
      count: number;
      tags: string[];
      note?: string;
    }
    defineNotification("flat", { topic: "ops", render: (data: Flat) => ({ title: data.id }) });
    // @ts-expect-error A Date is not a primitive; send an ISO string instead.
    defineNotification("dated", { topic: "ops", render: (data: { at: Date }) => ({ title: data.at.toISOString() }) });
    // @ts-expect-error A nested object is not flat; pick the fields instead.
    defineNotification("nested", { topic: "ops", render: (data: { user: { id: string } }) => ({ title: data.user.id }) });
  });

  it("rejects a name or topic that is not kebab-case", () => {
    const render = () => ({ title: "x" });
    expect(() => defineNotification("ImportFinished", { topic: "ops", render })).toThrow(/kebab-case/);
    expect(() => defineNotification("import-finished", { topic: "Ops Channel", render })).toThrow(/kebab-case/);
  });
});
