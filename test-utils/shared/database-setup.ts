import { execSync } from "node:child_process";
import { Client } from "pg";
import { TEST_DATABASE_URL, assertLocalDatabase } from "./test-database";
import { TEST_REDIS_URL, resetRedis } from "./test-redis";

/**
 * globalSetup of the tests that use the database (the Vitest `db` project and Playwright), run once before them.
 * Checks that the database and Redis are local, fails (instead of skipping) when either is unreachable, and
 * applies the migrations.
 */
export default async function setup(): Promise<void> {
  try {
    assertLocalDatabase(TEST_DATABASE_URL);
  } catch (error) {
    fail((error as Error).message);
  }

  const client = new Client({ connectionString: TEST_DATABASE_URL });
  try {
    await client.connect();
  } catch (error) {
    fail(
      `Test database is not reachable at ${new URL(TEST_DATABASE_URL).host} (${(error as { code?: string }).code ?? error}). ` +
        `Start it with "pnpm test:db:up", or run only the tests without a database with "pnpm test:vitest:unit".`,
    );
  } finally {
    await client.end().catch(() => {});
  }

  try {
    await resetRedis(TEST_REDIS_URL);
  } catch (error) {
    fail(
      `Test Redis is not reachable at ${new URL(TEST_REDIS_URL).host} (${(error as Error).message}). ` +
        `Start it with "pnpm test:db:up", or run only the tests without services with "pnpm test:vitest:unit".`,
    );
  }

  // The Prisma CLI connects with DIRECT_URL and loads .env itself; the value passed here wins over the one there.
  const prismaEnv = { ...process.env, DIRECT_URL: TEST_DATABASE_URL };
  try {
    execSync("pnpm exec prisma migrate deploy", { env: prismaEnv, stdio: "pipe" });
  } catch (error) {
    fail(`prisma migrate deploy failed on the test database:\n${(error as { stderr?: Buffer }).stderr ?? error}`);
  }

  // If a database built from the migrations alone differs from the schema, a migration is missing or
  // out of step. Deployed as is, that would first show up in production, so stop here (exit code 2 = changes).
  try {
    execSync("pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma --exit-code", {
      env: prismaEnv,
      stdio: "pipe",
    });
  } catch (error) {
    const { status, stdout, stderr } = error as { status?: number; stdout?: Buffer; stderr?: Buffer };
    if (status !== 2) fail(`prisma migrate diff failed on the test database:\n${stderr ?? error}`);
    fail(
      `The Prisma schema does not match prisma/migrations. Create the missing migration with "pnpm db:migrate".\n${stdout}`,
    );
  }
}

/** Vitest 5.0.5 fails to parse globalSetup error stacks and hides the message, so throw a stackless error. */
function fail(message: string): never {
  const error = new Error(message);
  error.stack = `Error: ${message}`;
  throw error;
}
