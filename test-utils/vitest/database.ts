import { beforeEach } from "vitest";
import { TEST_DATABASE_URL, resetDatabase } from "@/test-utils/shared/test-database";

/**
 * setupFiles of the Vitest `db` project, run before each test file.
 *
 * - Points the app's database connection (`DATABASE_URL`) at the test database, never the one in .env.
 * - Every test starts from an empty database and creates its own data.
 */
process.env.DATABASE_URL = TEST_DATABASE_URL;

beforeEach(() => resetDatabase(TEST_DATABASE_URL));
