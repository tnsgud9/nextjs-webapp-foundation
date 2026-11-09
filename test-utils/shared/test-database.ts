import { Client } from "pg";
import { TEST_ENV } from "./test-env";

/**
 * The test database: `DATABASE_URL` in `.env.test`, the Postgres in docker-compose.test.yaml (CI starts a service
 * container at the same address). The one in .env is never used.
 */
export const TEST_DATABASE_URL = TEST_ENV.DATABASE_URL;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Tests empty the tables, so refuse to start against a database that is not local (development or production). */
export function assertLocalDatabase(url: string): void {
  const { hostname } = new URL(url);
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(`Refusing to use a non-local test database (${hostname}). DATABASE_URL in .env.test must point to localhost.`);
  }
}

/** Empties every table in the public schema except `_prisma_migrations`, reading the table list from the database each time. */
export async function resetDatabase(url: string): Promise<void> {
  assertLocalDatabase(url);
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query<{ name: string }>(
      "select quote_ident(tablename) as name from pg_tables where schemaname = 'public' and tablename <> '_prisma_migrations'",
    );
    if (rows.length > 0) {
      await client.query(`truncate table ${rows.map((row) => `public.${row.name}`).join(", ")} restart identity cascade`);
    }
  } finally {
    await client.end();
  }
}
