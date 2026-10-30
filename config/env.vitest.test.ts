import { describe, expect, it } from "vitest";
import { importWithEnv } from "@/test-utils/vitest/helpers";

const UNSET = {
  NEXT_PUBLIC_APP_NAME: "",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
  NEXT_PUBLIC_SENTRY_DSN: "",
};
const loadEnv = (values: Record<string, string>) => importWithEnv({ ...UNSET, ...values }, () => import("./env"));

describe("public env", () => {
  it("treats empty values as unset", async () => {
    const { env, hasSupabaseEnvVars } = await loadEnv({});
    expect(env).toEqual({
      appName: "Web App",
      supabaseUrl: undefined,
      supabasePublishableKey: undefined,
      sentryDsn: undefined,
    });
    expect(hasSupabaseEnvVars).toBe(false);
  });

  it("takes the app name from NEXT_PUBLIC_APP_NAME", async () => {
    expect((await loadEnv({ NEXT_PUBLIC_APP_NAME: "Billing" })).env.appName).toBe("Billing");
  });

  it("enables Supabase only when both variables are set", async () => {
    expect((await loadEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://a.supabase.co" })).hasSupabaseEnvVars).toBe(false);
    const both = await loadEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://a.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "key" });
    expect(both.hasSupabaseEnvVars).toBe(true);
  });

  it("fails at load time on an invalid URL", async () => {
    await expect(loadEnv({ NEXT_PUBLIC_SENTRY_DSN: "not a url" })).rejects.toThrow(/Invalid environment variables/);
  });
});
