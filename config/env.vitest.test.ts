import { describe, expect, it } from "vitest";
import { importWithEnv } from "@/test-utils/vitest/helpers";

const UNSET = {
  NODE_ENV: "production",
  NEXT_PUBLIC_APP_NAME: "",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
  NEXT_PUBLIC_SENTRY_DSN: "",
  NEXT_PUBLIC_DESIGN_SYSTEM: "",
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

describe("design system showcase", () => {
  it("is closed in production builds by default", async () => {
    expect((await loadEnv({})).isDesignSystemEnabled).toBe(false);
  });

  it("opens with NEXT_PUBLIC_DESIGN_SYSTEM=1 or on the development server", async () => {
    expect((await loadEnv({ NEXT_PUBLIC_DESIGN_SYSTEM: "1" })).isDesignSystemEnabled).toBe(true);
    expect((await loadEnv({ NODE_ENV: "development" })).isDesignSystemEnabled).toBe(true);
  });

  it("rejects values other than 1", async () => {
    await expect(loadEnv({ NEXT_PUBLIC_DESIGN_SYSTEM: "true" })).rejects.toThrow(/Invalid environment variables/);
  });
});
