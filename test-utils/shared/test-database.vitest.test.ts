import { Client } from "pg";
import { describe, expect, it } from "vitest";
import { TEST_DATABASE_URL, assertLocalDatabase, resetDatabase } from "./test-database";

describe("assertLocalDatabase", () => {
  it.each(["postgresql://u:p@localhost:5433/db", "postgresql://u:p@127.0.0.1/db", "postgresql://u:p@[::1]/db"])(
    "allows %s",
    (url) => expect(() => assertLocalDatabase(url)).not.toThrow(),
  );

  it.each(["postgresql://u:p@aws-1-ap.pooler.supabase.com:6543/postgres", "postgresql://u:p@db.internal/db"])(
    "refuses %s",
    (url) => expect(() => assertLocalDatabase(url)).toThrow(/non-local/),
  );
});

describe("resetDatabase", () => {
  it("empties every table except the migration history", async () => {
    const client = new Client({ connectionString: TEST_DATABASE_URL });
    await client.connect();
    try {
      await client.query('create table if not exists "Reset Probe" (id int)');
      await client.query('insert into "Reset Probe" values (1)');
      await client.query("insert into _prisma_migrations (id, checksum, migration_name) values ('reset-probe', '', 'reset-probe')");

      await resetDatabase(TEST_DATABASE_URL);

      expect((await client.query('select count(*)::int as n from "Reset Probe"')).rows[0].n).toBe(0);
      expect((await client.query("select id from _prisma_migrations where id = 'reset-probe'")).rows).toHaveLength(1);
    } finally {
      await client.query("delete from _prisma_migrations where id = 'reset-probe'");
      await client.query('drop table if exists "Reset Probe"');
      await client.end();
    }
  });
});
