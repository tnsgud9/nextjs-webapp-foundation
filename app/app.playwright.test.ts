import { type APIRequestContext, expect, test } from "@playwright/test";
import { PLAYWRIGHT_APP_NAME } from "@/test-utils/playwright/app";
import { captureSentryEvents } from "@/test-utils/playwright/sentry";
import { SESSION_COOKIE_NAME, sessionCookieHeader } from "@/test-utils/playwright/supabase-auth";

const BASE_CSP = "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";
const SECURITY_HEADERS = {
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  "strict-transport-security": "max-age=31536000",
};

test.describe("responses", () => {
  for (const path of ["/", "/api/health", "/does-not-exist", "/icon.svg"]) {
    test(`security headers are set on ${path}`, async ({ request }) => {
      const headers = (await request.get(path)).headers();
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) expect(headers[name], name).toBe(value);
      expect(headers["content-security-policy"]).toContain(BASE_CSP);
      expect(headers["x-powered-by"]).toBeUndefined();
    });
  }

  test("pages allow only scripts carrying this request's nonce", async ({ request }) => {
    const nonceOf = async () => {
      const response = await request.get("/");
      const csp = response.headers()["content-security-policy"];
      const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
      expect(csp).toContain("'strict-dynamic'");
      const html = await response.text();
      expect(html.match(/<script/g)?.length).toBe(html.match(/<script[^>]* nonce="([^"]+)"/g)?.length);
      expect(html).toContain(`nonce="${nonce}"`);
      return nonce;
    };
    expect(await nonceOf()).not.toBe(await nonceOf());

    // A page the proxy skips (image-like URL) still blocks inline scripts.
    const skipped = (await request.get("/missing.png")).headers()["content-security-policy"];
    expect(skipped).toContain("script-src 'self'");
    expect(skipped).not.toContain("'nonce-");
  });

  test("pages run without CSP violations", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (message) => {
      if (message.text().includes("Content Security Policy")) violations.push(message.text());
    });
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/light|dark/); // next-themes' inline script ran.
    expect(violations).toEqual([]);
  });

  test("a script injected into the page markup without the nonce does not run", async ({ page }) => {
    // Simulate stored XSS: a script mixed into the server's HTML, with the CSP header left in place.
    await page.route("/", async (route) => {
      const response = await route.fetch();
      const html = (await response.text()).replace("</body>", "<script>window.__injected = true</script></body>");
      await route.fulfill({ response, body: html });
    });
    await page.goto("/");
    expect(await page.evaluate(() => (window as { __injected?: boolean }).__injected)).toBeUndefined();
  });

  test("health check answers ok without caching", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok" });
  });

  test("status codes: 404 for unknown routes, 500 for server errors, 307 for sign-in", async ({ request }) => {
    expect((await request.get("/does-not-exist")).status()).toBe(404);

    const serverError = await request.get("/playwright/server-error");
    expect(serverError.status()).toBe(500);
    expect(await serverError.text()).not.toContain("PLAYWRIGHT-SECRET");

    const protectedPage = await request.get("/playwright/protected", { maxRedirects: 0 });
    expect(protectedPage.status()).toBe(307);
    expect(protectedPage.headers()["location"]).toBe("/login");
  });
});

test.describe("sign-in (fake Supabase Auth)", () => {
  const USER = { sub: "11111111-1111-1111-1111-111111111111", email: "user@example.com" };
  const visit = (request: APIRequestContext, cookie: string) =>
    request.get("/playwright/protected", { maxRedirects: 0, headers: { cookie } });

  test("signed-in users reach protected pages", async ({ request }) => {
    const response = await visit(request, sessionCookieHeader(USER));
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(USER.sub);
  });

  test("forged, anonymous, and revoked sessions are sent to sign-in", async ({ request }) => {
    for (const cookie of [
      sessionCookieHeader(USER, { forged: true }),
      sessionCookieHeader({ ...USER, is_anonymous: true }),
      sessionCookieHeader({ ...USER, expiresIn: -3600 }, { refreshable: false }),
    ]) {
      const response = await visit(request, cookie);
      expect(response.status()).toBe(307);
      expect(response.headers()["location"]).toBe("/login");
    }
  });

  test("the proxy refreshes an expired session and stores the new cookie", async ({ request }) => {
    const response = await visit(request, sessionCookieHeader({ ...USER, expiresIn: -3600 }));
    expect(response.status()).toBe(200);
    expect(response.headers()["set-cookie"]).toContain(`${SESSION_COOKIE_NAME}=`);
  });
});

test.describe("pages", () => {
  test("home page renders in English", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Ready to start" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page).toHaveTitle(PLAYWRIGHT_APP_NAME);
    await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute("href", /\/icon\.svg/);
  });

  test("pages download only the font weights they use", async ({ page }) => {
    const fonts: string[] = [];
    page.on("requestfinished", (request) => {
      if (request.resourceType() === "font") fonts.push(request.url());
    });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check('16px "Pretendard"', "Ready"))).toBe(true);
    expect(fonts.length).toBeGreaterThan(0);
    for (const url of fonts) expect(url).toMatch(/Pretendard-\w+\.subset\./);
    // The home page uses a few of the 9 weights, not all of them.
    expect(fonts.length).toBeLessThan(9);
  });

  test("characters Pretendard lacks fall back to Noto Sans from this origin", async ({ page, baseURL }) => {
    const fonts: string[] = [];
    page.on("requestfinished", (request) => {
      if (request.resourceType() === "font") fonts.push(request.url());
    });
    await page.goto("/");
    // Devanagari is in neither Pretendard nor Pretendard JP.
    await page.evaluate(() => {
      const text = document.createElement("p");
      text.textContent = "नमस्ते";
      document.body.append(text);
    });
    await expect
      .poll(() =>
        page.evaluate(() =>
          Array.from(document.fonts).some((face) => face.family.replaceAll('"', "") === "Noto Sans" && face.status === "loaded"),
        ),
      )
      .toBe(true);
    const notoFiles = fonts.filter((url) => !/Pretendard/.test(url));
    expect(notoFiles.length).toBeGreaterThan(0);
    for (const url of notoFiles) expect(url.startsWith(`${baseURL}/_next/static/media/`)).toBe(true);
  });

  test("toast.add() shows a toast through the app-wide Toaster", async ({ page }) => {
    await page.goto("/playwright/toast");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("The change was saved.")).toBeVisible();
  });

  test("unknown routes show the not-found page", async ({ page }) => {
    await page.goto("/does-not-exist");
    await expect(page.getByText("Page not found")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
  });

  test("server errors show the error page with a digest and are not re-reported by the browser", async ({ page }) => {
    const events = await captureSentryEvents(page);
    await page.goto("/playwright/server-error");

    await expect(page.getByText("Something went wrong")).toBeVisible();
    await expect(page.getByText(/Error code: \S+/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("PLAYWRIGHT-SECRET");

    // The server (onRequestError) reports server errors; a browser report would be a duplicate.
    await page.waitForTimeout(1_000);
    expect(events).toEqual([]);
  });

  test("unexpected Server Action errors show the error page and are not re-reported by the browser", async ({
    page,
  }) => {
    const events = await captureSentryEvents(page);
    await page.goto("/playwright/action-error");
    await page.getByRole("button", { name: "Submit" }).click();

    await expect(page.getByText("Something went wrong")).toBeVisible();
    await expect(page.getByText(/Error code: \S+/)).toBeVisible();
    await expect(page.locator("body")).not.toContainText("PLAYWRIGHT-SECRET");

    await page.waitForTimeout(1_000);
    expect(events).toEqual([]);
  });

  test("browser errors show the error page and are reported to Sentry", async ({ page }) => {
    const events = await captureSentryEvents(page);
    await page.goto("/playwright/client-error");
    await page.getByRole("button", { name: "Throw error" }).click();

    await expect(page.getByText("Something went wrong")).toBeVisible();
    await expect(page.getByText(/Error code/)).toHaveCount(0);
    await expect.poll(() => events.some((body) => body.includes("PLAYWRIGHT-CLIENT-ERROR"))).toBe(true);
  });
});
