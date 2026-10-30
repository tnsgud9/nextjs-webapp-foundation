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

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
