import { env } from "../config/env";

/**
 * Content-Security-Policy, shared by `next.config.ts` (every response) and `proxy.ts` (page requests).
 *
 * - Everything loads from this origin only (`default-src 'self'`). Images and fonts may also be inline data, and the
 *   browser may connect only to this origin and the Supabase project, so injected markup cannot send data
 *   elsewhere. Add a service's other origins to the directive that needs them.
 * - Without a nonce, `script-src 'self'` blocks inline scripts, so a page the proxy skips (its matcher leaves out
 *   image and font URLs) fails closed instead of running injected scripts.
 * - Page requests get `script-src` with the nonce the proxy creates per request. Next.js reads the nonce from the
 *   request's CSP header and puts it on its inline scripts; `'strict-dynamic'` trusts the bundles they load.
 *   Scripts without the nonce (such as injected XSS) do not run.
 * - Styles are not restricted: a nonce does not cover `style=` attributes, which components rely on.
 * - The design system showcase (closed in production) loads sample photos and avatars from other sites.
 */
const origin = (url: string | undefined) => (url ? new URL(url).origin : "");
const supabase = origin(env.supabaseUrl);
const connectSources = ["'self'", supabase, supabase.replace(/^http/, "ws")].filter(Boolean);

const BASE_DIRECTIVES = [
  "default-src 'self'",
  `connect-src ${connectSources.join(" ")}`,
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
];

export function contentSecurityPolicy(nonce?: string, pathname = ""): string {
  const images = pathname.startsWith("/design-system") ? "img-src 'self' data: blob: https:" : "img-src 'self' data: blob:";
  if (!nonce) return [...BASE_DIRECTIVES, images, "script-src 'self'"].join("; ");
  // React uses eval for debugging information in development; production builds do not need it.
  const evalSource = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  return [...BASE_DIRECTIVES, images, `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${evalSource}`].join("; ");
}
