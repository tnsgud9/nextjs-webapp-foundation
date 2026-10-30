import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { TEST_DATABASE_URL } from "@/test-utils/shared/test-database";

describe("data access layer", () => {
  it("queries the test database, never the app database from .env", async () => {
    expect(process.env.DATABASE_URL).toBe(TEST_DATABASE_URL);
    const [row] = await db.$queryRaw<{ name: string }[]>`select current_database() as name`;
    expect(row.name).toBe(new URL(TEST_DATABASE_URL).pathname.slice(1));
  });
});
