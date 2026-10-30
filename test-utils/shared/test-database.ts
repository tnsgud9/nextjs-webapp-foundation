import { Client } from "pg";

/**
 * The test database. Defaults to the Postgres in docker-compose.test.yaml; CI starts a service container at the same address.
 * Set `TEST_DATABASE_URL` to use another one. The app's `DATABASE_URL` is never reused.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/app_test";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Tests empty the tables, so refuse to start against a database that is not local (development or production). */
export function assertLocalDatabase(url: string): void {
  const { hostname } = new URL(url);
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(`Refusing to use a non-local test database (${hostname}). TEST_DATABASE_URL must point to localhost.`);
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
