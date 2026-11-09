import { defineConfig, devices } from "@playwright/test";
import { PLAYWRIGHT_APP_NAME } from "./test-utils/playwright/app";
import { FAKE_SUPABASE_PORT, FAKE_SUPABASE_URL } from "./test-utils/playwright/supabase-auth";
import { fakeSupabaseEnv } from "./test-utils/shared/supabase-auth";
import { TEST_DATABASE_URL, assertLocalDatabase } from "./test-utils/shared/test-database";
import { TEST_REDIS_URL, assertLocalRedis } from "./test-utils/shared/test-redis";

const PORT = 3100;

assertLocalDatabase(TEST_DATABASE_URL);
assertLocalRedis(TEST_REDIS_URL);

/**
 * Playwright config. Runs `*.playwright.test.ts` files, which sit next to the code they cover.
 * Builds and starts a production build with `PLAYWRIGHT=1`, then tests it in a real browser (Chromium).
 *
 * - Test pages in `app/playwright/**` become routes only in `PLAYWRIGHT=1` builds (next.config.ts).
 * - Supabase points to the fake Auth server (test-utils/shared/supabase-auth.ts), started before the app.
 * - The database and Redis are pinned to the test services (the database migrated before the run); the ones in .env
 *   are never reached.
 * - The Sentry DSN is an unreachable address; tests intercept the browser's requests instead.
 * - The build goes to `.next`, overwriting a normal build.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "**/*.playwright.test.ts",
  testIgnore: ["**/node_modules/**", ".next/**"],
  forbidOnly: Boolean(process.env.CI),
  globalSetup: "./test-utils/shared/database-setup.ts",
  reporter: process.env.CI ? "github" : "list",
  // Traces of failed tests stay in test-results/ (CI uploads them as an artifact on failure).
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  webServer: [
    {
      command: `node test-utils/playwright/supabase-auth-server.mjs ${FAKE_SUPABASE_PORT}`,
      url: `${FAKE_SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
    },
    {
      command: `pnpm build && pnpm start --port ${PORT}`,
      url: `http://localhost:${PORT}/api/health`,
      timeout: 300_000,
      env: {
        PLAYWRIGHT: "1",
        NEXT_PUBLIC_APP_NAME: PLAYWRIGHT_APP_NAME,
        NEXT_PUBLIC_SENTRY_DSN: "http://public@localhost:9/1",
        DATABASE_URL: TEST_DATABASE_URL,
        REDIS_URL: TEST_REDIS_URL,
        ...fakeSupabaseEnv(FAKE_SUPABASE_URL),
      },
    },
  ],
});
