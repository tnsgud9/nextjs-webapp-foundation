import { describe, expect, it } from "vitest";
import { importWithEnv } from "@/test-utils/vitest/helpers";

const SUPABASE = "https://project.supabase.example";
const SENTRY_DSN = "https://public@errors.example/1";

/** Loads lib/csp.ts with these public variables, which it reads at load time. */
const loadCsp = (env: Record<string, string> = {}) =>
  importWithEnv({ NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SENTRY_DSN: "", ...env }, () => import("./csp"));

const directive = (csp: string, name: string) => csp.split("; ").find((part) => part.startsWith(`${name} `));

describe("content security policy", () => {
  it("loads everything from this origin and blocks framing, plugins, and other form targets", async () => {
    const { contentSecurityPolicy } = await loadCsp();
    const csp = contentSecurityPolicy();
    for (const part of [
      "default-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "img-src 'self' data: blob:",
    ]) {
      expect(csp.split("; ")).toContain(part);
    }
    expect(directive(csp, "connect-src")).toBe("connect-src 'self'");
  });

  it("lets the browser connect to the Supabase project (and its websocket) and Sentry, by origin only", async () => {
    const { contentSecurityPolicy } = await loadCsp({
      NEXT_PUBLIC_SUPABASE_URL: `${SUPABASE}/rest/v1`,
      NEXT_PUBLIC_SENTRY_DSN: SENTRY_DSN,
    });
    expect(directive(contentSecurityPolicy(), "connect-src")).toBe(
      `connect-src 'self' ${SUPABASE} wss://project.supabase.example https://errors.example`,
    );
  });

  it("blocks inline scripts without a nonce, so a page the proxy skips fails closed", async () => {
    const { contentSecurityPolicy } = await loadCsp();
    expect(directive(contentSecurityPolicy(), "script-src")).toBe("script-src 'self'");
  });

  it("allows only scripts with the request's nonce, and never inline or eval in production", async () => {
    const { contentSecurityPolicy } = await loadCsp({ NODE_ENV: "production" });
    const scripts = directive(contentSecurityPolicy("abc123"), "script-src");
    expect(scripts).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
  });

  it("allows eval only in development, for React's debugging information", async () => {
    const { contentSecurityPolicy } = await loadCsp({ NODE_ENV: "development" });
    expect(directive(contentSecurityPolicy("abc123"), "script-src")).toContain("'unsafe-eval'");
  });

  it("lets only the design system showcase load images from other sites", async () => {
    const { contentSecurityPolicy } = await loadCsp();
    expect(directive(contentSecurityPolicy("n", "/design-system/components"), "img-src")).toBe(
      "img-src 'self' data: blob: https:",
    );
    expect(directive(contentSecurityPolicy("n", "/items"), "img-src")).toBe("img-src 'self' data: blob:");
  });
});
