import { beforeEach } from "vitest";
import { TEST_DATABASE_URL, resetDatabase } from "@/test-utils/shared/test-database";
import { TEST_REDIS_URL, resetRedis } from "@/test-utils/shared/test-redis";

/**
 * setupFiles of the Vitest `db` project, run before each test file. The app already connects to the test services
 * (`.env.test` is the environment of every test); every test starts from an empty database and an empty Redis, and
 * creates its own data.
 */

beforeEach(() => Promise.all([resetDatabase(TEST_DATABASE_URL), resetRedis(TEST_REDIS_URL)]));
