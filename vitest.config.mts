import { configDefaults, defineConfig } from "vitest/config";

const GUARD_MODULE = "\0next-module-guard";

/** Tests that need a real Postgres. Only data/ queries the database, so this is data/ tests plus the test-utils self-checks. */
const DB_TESTS = ["data/**/*.vitest.test.ts", "test-utils/**/*.vitest.test.ts"];

/**
 * Vitest config. Runs `*.vitest.test.ts`, which sit next to the code they cover. Unrelated to the Next.js build.
 *
 * - `unit`: tests without external dependencies, run file by file in parallel.
 * - `db`: tests against the test database (docker-compose.test.yaml). Tables are emptied before each test,
 *   so files run one at a time. If the database is unreachable they fail instead of being skipped.
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
    // Shared mocks (Sentry, next/headers) and log silencing. Test helpers live in test-utils/<tool>/.
    setupFiles: ["test-utils/vitest/setup.ts"],
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          // Test files are split by the tool that runs them; Playwright runs `*.playwright.test.ts`.
          include: ["**/*.vitest.test.ts"],
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
