import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

/**
 * The test environment: every variable in `.env.test` at the repository root (Vitest and Playwright run from there).
 * Vitest gives it to every test, and Playwright to the app server it starts. It sets every variable, so `.env` provides none.
 * An empty value means unset.
 */
export const TEST_ENV: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(parseEnv(readFileSync(join(process.cwd(), ".env.test"), "utf8"))).map(([key, value]) => [
      key,
      value ?? "",
    ]),
  ),
);
