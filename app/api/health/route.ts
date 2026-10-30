import { withRouteErrorHandler } from "@/lib/server/error-handlers";

/**
 * Liveness check. Anyone can call it without auth, so it touches no database or external service
 * and exposes no internal state. Check dependencies from a separate, protected route instead.
 */
export const dynamic = "force-dynamic";

export const GET = withRouteErrorHandler(async () =>
  Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } }),
);
