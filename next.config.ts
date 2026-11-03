import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import { contentSecurityPolicy } from "./lib/csp";

/**
 * Security headers for every response. The CSP is built in `lib/csp.ts`; the proxy adds a nonce on page requests.
 * HSTS does not force subdomains or preload; tighten it once the domain policy is settled.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

/**
 * Playwright test pages (`page.playwright.tsx` under `app/playwright/**`) become routes only in a
 * `PLAYWRIGHT=1` build. A normal build does not treat them as pages and never compiles them.
 */
const pageExtensions = ["tsx", "ts", "jsx", "js"];

const nextConfig: NextConfig = {
  // Only the Docker image (Dockerfile) uses standalone output, bundling just the files needed to run.
  // Local and hosted builds stay as they are (Windows builds can hit symlink permission errors,
  // and standalone does not work with `next start`).
  output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined,
  pageExtensions:
    process.env.PLAYWRIGHT === "1" ? ["playwright.tsx", ...pageExtensions] : pageExtensions,
  poweredByHeader: false,
  // The build type-checks app code only (tsconfig.build.json); `pnpm typecheck` covers tests too.
  typescript: { tsconfigPath: "tsconfig.build.json" },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

/**
 * Sentry build settings. The Sentry build plugin reads SENTRY_AUTH_TOKEN, SENTRY_ORG, and SENTRY_PROJECT
 * for source map upload straight from the environment. Without them it skips the upload and the build continues.
 * Uploaded source maps are deleted from the build output by default (`deleteSourcemapsAfterUpload`), so they are never public.
 */
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
