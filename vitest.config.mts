import { configDefaults, defineConfig } from "vitest/config";

const GUARD_MODULE = "\0next-module-guard";

/**
 * Tests that need the real test services (Postgres, Redis). Only data/ uses the database and Redis, so this is data/
 * tests, the Redis client's own test, and the test-utils self-checks.
 */
const DB_TESTS = [
  "data/**/*.vitest.test.{ts,tsx}",
  "lib/db.vitest.test.ts",
  "lib/redis/client.vitest.test.ts",
  "test-utils/**/*.vitest.test.{ts,tsx}",
];

/**
 * Vitest config. Runs `*.vitest.test.ts` and `*.vitest.test.tsx`, which sit next to the code they cover.
 * Unrelated to the Next.js build. There is no DOM: a `.tsx` test renders on the server (react-dom/server), and
 * Playwright covers behaviour in the browser.
 *
 * - `unit`: tests without external dependencies, run file by file in parallel.
 * - `db`: tests against the test database and test Redis (docker-compose.test.yaml). Tables and Redis are emptied
 *   before each test, so files run one at a time. If either is unreachable they fail instead of being skipped.
 *
 * Every test runs with the variables in `.env.test` (test-utils/vitest/env.ts), never those in .env.
 *
 * `server-only` / `client-only` are guards only the Next.js bundler understands; importing them in Node fails.
 * Tests replace them with empty modules, and the Next.js build enforces the guards.
 */
export default defineConfig({
  plugins: [
    {
      name: "next-module-guards",
      enforce: "pre",
      resolveId: (id) => (id === "server-only" || id === "client-only" ? GUARD_MODULE : null),
      load: (id) => (id === GUARD_MODULE ? "export {};" : null),
    },
  ],
  resolve: { tsconfigPaths: true },
  test: {
    // The test environment (.env.test), then shared mocks (Sentry, next/headers, notify) and log silencing.
    // Test helpers live in test-utils/<tool>/.
    setupFiles: ["test-utils/vitest/env.ts", "test-utils/vitest/setup.ts"],
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          // Test files are split by the tool that runs them; Playwright runs `*.playwright.test.ts`.
          include: ["**/*.vitest.test.{ts,tsx}"],
          exclude: [...configDefaults.exclude, ...DB_TESTS],
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          include: DB_TESTS,
          globalSetup: ["test-utils/shared/database-setup.ts"],
          setupFiles: ["test-utils/vitest/database.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
});
