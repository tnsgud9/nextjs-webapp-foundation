import { TEST_ENV } from "@/test-utils/shared/test-env";

/**
 * The first setupFiles entry of every Vitest test file: the test environment (`.env.test`) replaces whatever the
 * shell set, before the test file loads any module that reads it.
 */
Object.assign(process.env, TEST_ENV);
