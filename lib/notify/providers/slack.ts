import "server-only";
import { api } from "@/lib/ky";
import { escapeWithin, truncate, webUrl } from "./format";
import type { Notification, NotifyProvider } from "../types";

/**
 * Slack provider: posts to one channel through an incoming webhook.
 *
 * - Text that Slack reads as markup is escaped, so `<!channel>`, `<@U…>`, or `<url|label>` inside a
 *   notification shows as text and never mentions anyone or hides a link.
 * - Text is cut to Slack's block limits instead of being rejected.
 * - A 429 is retried once after `Retry-After` (at most 5 seconds); other failures throw.
 */
const LIMITS = { header: 150, text: 3000, fields: 10, field: 2000, button: 75, url: 3000 } as const;
const TIMEOUT_MS = 3000;
const LEVEL_PREFIX = { info: "", warning: "[Warning] ", critical: "[Critical] " } as const;

/** Escapes the three characters Slack reads as markup in `mrkdwn` text. */
export function escapeSlackText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The webhook request body for a notification. */
export function toSlackPayload(notification: Notification): Record<string, unknown> {
  const { title, text, level = "info", fields = [], link } = notification;
  const headline = `${LEVEL_PREFIX[level]}${title}`;
  const url = link && webUrl(link.url);
  const blocks: Record<string, unknown>[] = [
    { type: "header", text: { type: "plain_text", text: truncate(headline, LIMITS.header), emoji: false } },
  ];
  if (text) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: escapeWithin(text, LIMITS.text, escapeSlackText) } });
  }
  if (fields.length > 0) {
    blocks.push({
      type: "section",
      fields: fields.slice(0, LIMITS.fields).map(({ label, value }) => ({
        type: "mrkdwn",
        text: escapeWithin(`*${label}*\n${value}`, LIMITS.field, escapeSlackText),
      })),
    });
  }
  if (url && url.length <= LIMITS.url) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: truncate(link.label || "Open", LIMITS.button), emoji: false },
          url,
        },
      ],
    });
  }
  // `text` is the fallback for notifications and screen readers.
  return { text: escapeWithin(headline, LIMITS.text, escapeSlackText), blocks };
}

/** A provider that posts to the incoming webhook at `webhookUrl`, a secret. */
export function createSlackProvider(webhookUrl: string): NotifyProvider {
  return {
    name: "slack",
    async send(notification) {
      await api.post(webhookUrl, {
        json: toSlackPayload(notification),
        timeout: TIMEOUT_MS,
        retry: { limit: 1, methods: ["post"], statusCodes: [429], afterStatusCodes: [429], maxRetryAfter: 5000 },
      });
    },
  };
}
