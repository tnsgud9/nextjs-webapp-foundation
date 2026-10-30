import type { Page } from "@playwright/test";

/**
 * Intercepts the browser's Sentry requests and collects only error event bodies, without sending them.
 * The returned array fills up as later requests arrive.
 */
export async function captureSentryEvents(page: Page): Promise<string[]> {
  const events: string[] = [];
  await page.route("**/api/1/envelope/**", async (route) => {
    const body = route.request().postData() ?? "";
    if (body.includes('"type":"event"')) events.push(body);
    await route.fulfill({ status: 200, body: "{}" });
  });
  return events;
}
