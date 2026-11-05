import * as Sentry from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import { loggedErrors } from "@/test-utils/vitest/setup";
import { onRequestError } from "./instrumentation";

describe("instrumentation", () => {
  it("logs the server errors Next.js catches and reports them to Sentry", async () => {
    const error = Object.assign(new Error("render failed"), { digest: "123" });
    const request = { path: "/items/1?secret=q", method: "GET", headers: { "x-request-id": "req-1" } };
    const context = {
      routerKind: "App Router",
      routePath: "/items/[id]",
      routeType: "render",
      renderSource: "server-rendering",
      revalidateReason: undefined,
      renderType: "dynamic",
    } as const;

    await onRequestError(error, request, context);

    expect(Sentry.captureRequestError).toHaveBeenCalledWith(error, request, context);
    expect(loggedErrors()).toEqual([
      expect.objectContaining({
        body: "Unhandled error in a request",
        "request.id": "req-1",
        "http.request.method": "GET",
        "url.path": "/items/1",
        "next.route_type": "render",
        "next.route_path": "/items/[id]",
        "next.digest": "123",
      }),
    ]);
    expect(JSON.stringify(loggedErrors())).not.toContain("secret=q");
  });
});
