import { beforeEach } from "vitest";
import { TEST_DATABASE_URL, resetDatabase } from "@/test-utils/shared/test-database";
import { TEST_REDIS_URL, resetRedis } from "@/test-utils/shared/test-redis";

/**
 * setupFiles of the Vitest `db` project, run before each test file.
 *
 * - Points the app's database and Redis connections (`DATABASE_URL`, `REDIS_URL`) at the test
 *   services, never the ones in .env.
 * - Every test starts from an empty database and an empty Redis, and creates its own data.
 */
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.REDIS_URL = TEST_REDIS_URL;

beforeEach(() => Promise.all([resetDatabase(TEST_DATABASE_URL), resetRedis(TEST_REDIS_URL)]));
