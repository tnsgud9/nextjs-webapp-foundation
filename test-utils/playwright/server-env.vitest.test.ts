import { describe, expect, it } from "vitest";
import { TEST_ENV } from "../shared/test-env";
import { playwrightServerEnv } from "./server-env";

describe("Playwright server environment", () => {
  it("sets every variable in .env.test, so .env never reaches the test server", () => {
    const env = playwrightServerEnv();
    for (const key of Object.keys(TEST_ENV)) expect(env, key).toHaveProperty(key);
  });

  it("changes only the build flag and the Supabase address", () => {
    const env = playwrightServerEnv();
    const changed = Object.keys(env).filter((key) => env[key] !== TEST_ENV[key]).sort();
    expect(changed).toEqual(["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_URL", "PLAYWRIGHT"]);
  });
});
