import { HTTPError } from "ky";
import { describe, expect, it, vi } from "vitest";
import { createSlackProvider, toSlackPayload } from "./slack";

const WEBHOOK = "https://hooks.test/services/secret";
const CONTEXT = { kind: "hello", topic: "ops" };

/** Stubs fetch with these responses in order, and returns the mock and the requests it received. */
function respondWith(...responses: Response[]) {
  const requests: { method: string; url: string; body: string }[] = [];
  const fetch = vi.fn(async (request: Request) => {
    requests.push({ method: request.method, url: request.url, body: await request.clone().text() });
    return responses.shift() ?? new Response("ok");
  });
  vi.stubGlobal("fetch", fetch);
  return { fetch, requests };
}

const blocks = (payload: Record<string, unknown>) => payload.blocks as Record<string, unknown>[];

describe("Slack payload", () => {
  it("maps a notification to a header, text, fields, and a link button", () => {
    const payload = toSlackPayload({
      title: "Import finished",
      text: "3 rows were skipped.",
      level: "warning",
      fields: [{ label: "Rows", value: "120" }],
      link: { url: "https://app.test/imports/1", label: "View" },
    });
    expect(payload.text).toBe("[Warning] Import finished");
    expect(blocks(payload)).toEqual([
      { type: "header", text: { type: "plain_text", text: "[Warning] Import finished", emoji: false } },
      { type: "section", text: { type: "mrkdwn", text: "3 rows were skipped." } },
      { type: "section", fields: [{ type: "mrkdwn", text: "*Rows*\n120" }] },
      {
        type: "actions",
        elements: [
          { type: "button", text: { type: "plain_text", text: "View", emoji: false }, url: "https://app.test/imports/1" },
        ],
      },
    ]);
  });

  it("escapes markup so text cannot mention anyone or hide a link", () => {
    const payload = toSlackPayload({
      title: "<!channel> & co",
      text: "<!here> <@U123> <https://evil.test|click>",
      fields: [{ label: "<!everyone>", value: "a > b" }],
    });
    const [header, ...mrkdwnBlocks] = blocks(payload);
    expect(payload.text).toBe("&lt;!channel&gt; &amp; co");
    // Slack shows plain_text as written, so the header needs no escaping.
    expect(header).toMatchObject({ text: { type: "plain_text", text: "<!channel> & co" } });
    const json = JSON.stringify(mrkdwnBlocks);
    expect(json).not.toMatch(/<!|<@|<https/);
    expect(json).toContain("&lt;!here&gt; &lt;@U123&gt; &lt;https://evil.test|click&gt;");
    expect(json).toContain("*&lt;!everyone&gt;*\\na &gt; b");
  });

  it("cuts text to Slack's limits without splitting an escape sequence", () => {
    const payload = toSlackPayload({
      title: "t".repeat(200),
      text: "<".repeat(2000),
      fields: Array.from({ length: 12 }, (_, i) => ({ label: `f${i}`, value: "v" })),
    });
    const [header, text, fields] = blocks(payload) as { text?: { text: string }; fields?: unknown[] }[];
    expect(header.text?.text).toHaveLength(150);
    expect(text.text?.text.length).toBeLessThanOrEqual(3000);
    expect(text.text?.text).toMatch(/^(&lt;)+…$/);
    expect(fields.fields).toHaveLength(10);
  });

  it("drops a link that is not an http(s) URL", () => {
    for (const url of ["javascript:alert(1)", "not a url", "/relative"]) {
      expect(blocks(toSlackPayload({ title: "t", link: { url } })).map((block) => block.type)).toEqual(["header"]);
    }
  });
});

describe("Slack provider", () => {
  it("posts the payload as JSON to the webhook", async () => {
    const { requests } = respondWith(new Response("ok"));
    await createSlackProvider(WEBHOOK).send({ title: "Hello" }, CONTEXT);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ method: "POST", url: WEBHOOK });
    expect(JSON.parse(requests[0].body)).toMatchObject({ text: "Hello" });
  });

  it("retries once after a 429", async () => {
    const { fetch } = respondWith(
      new Response("rate_limited", { status: 429, headers: { "retry-after": "0" } }),
      new Response("ok"),
    );
    await createSlackProvider(WEBHOOK).send({ title: "Hello" }, CONTEXT);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws when Slack rejects the message, without retrying other statuses", async () => {
    const { fetch } = respondWith(new Response("invalid_payload", { status: 400 }));
    await expect(createSlackProvider(WEBHOOK).send({ title: "Hello" }, CONTEXT)).rejects.toBeInstanceOf(HTTPError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
